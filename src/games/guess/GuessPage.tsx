import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useShell } from "@/app/providers/ShellProvider";
import { useLocalStorageState } from "@/lib/storage";
import { capitalize, normalizeGuessToken } from "@/lib/text";
import { cn } from "@/lib/utils";
import { fetchGenerationRoster, fetchPokemon } from "@/lib/pokeapi/api";
import type { Pokemon } from "@/lib/pokeapi/types";
import { CATEGORY_LABELS } from "@/lib/constants";
import {
  FILTER_KEY,
  MODE_KEY,
  defaultFilters,
  parseFilters
} from "@/games/smash/smashStorage";
import type { SmashFiltersStorage } from "@/games/smash/smashTypes";
import {
  buildGuessCluePlan,
  compareGuessPokemon,
  GUESS_MAX_ATTEMPTS,
  humanizeTypeList
} from "@/games/guess/guessLogic";
import {
  GUESS_STATS_KEY,
  defaultGuessStats,
  parseGuessStats,
  type GuessStatsStorage
} from "@/games/guess/guessStorage";

type GuessStatus = "idle" | "loading" | "empty" | "playing" | "won" | "lost";

type GuessState = {
  targetName: string;
  targetPokemon: Pokemon | null;
  clues: Array<{ id: string; label: string; value: string }>;
  guesses: ReturnType<typeof compareGuessPokemon>[];
  attempts: number;
  status: GuessStatus;
  message: string;
};

const GEN_TOTAL = 9;

const unique = <T,>(items: T[]) => Array.from(new Set(items));

const getGuessStatusLabel = (guess: GuessState) => {
  let statusLabel = "GuessDex: Ready";
  if (guess.status === "empty") {
    statusLabel = "GuessDex: Select at least one generation.";
  } else if (guess.status === "loading") {
    statusLabel = "GuessDex: loading round…";
  } else if (guess.status === "playing") {
    statusLabel = `GuessDex: ${guess.attempts}/${GUESS_MAX_ATTEMPTS} guesses`;
  } else if (guess.status === "won") {
    statusLabel = `GuessDex: solved in ${guess.attempts}/${GUESS_MAX_ATTEMPTS}`;
  } else if (guess.status === "lost") {
    statusLabel = "GuessDex: out of guesses";
  }
  return statusLabel;
};

const buildGuessHelpBody = () => (
  <div className="grid gap-2 text-sm">
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold">Goal</span>
      <span className="text-muted-foreground">Solve in 6 guesses</span>
    </div>
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold">Hints</span>
      <span className="text-muted-foreground">Unlock after misses</span>
    </div>
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold">Next</span>
      <span className="text-muted-foreground">After win/loss</span>
    </div>
  </div>
);

const buildRosterLookup = (roster: string[]) => {
  const lookup = new Map<string, string>();
  roster.forEach((name) => {
    const pretty = capitalize(name);
    const aliases = [
      name,
      pretty,
      name.replace(/-/g, " "),
      pretty.replace(/-/g, " "),
      name.replace(/-/g, ""),
      pretty.replace(/\s+/g, "")
    ];
    aliases.forEach((alias) => {
      const token = normalizeGuessToken(alias);
      if (!token || lookup.has(token)) return;
      lookup.set(token, name);
    });
  });
  return lookup;
};

const getGuessMissCount = (guess: GuessState) => {
  if (guess.status === "won") {
    return Math.max(0, guess.attempts - 1);
  }
  return guess.attempts;
};

export const GuessPage = () => {
  const shell = useShell();
  const queryClient = useQueryClient();

  const initialFilters = React.useMemo(() => defaultFilters(), []);
  const initialGuessStats = React.useMemo(() => defaultGuessStats(), []);

  const [filters, setFilters] = useLocalStorageState<SmashFiltersStorage>(
    FILTER_KEY,
    initialFilters,
    { parse: parseFilters }
  );
  const [guessStats, setGuessStats] = useLocalStorageState<GuessStatsStorage>(
    GUESS_STATS_KEY,
    initialGuessStats,
    { parse: parseGuessStats }
  );

  const [roster, setRoster] = React.useState<string[]>([]);
  const lookupRef = React.useRef<Map<string, string>>(new Map());
  const lastTargetRef = React.useRef<string>("");
  const roundTokenRef = React.useRef(0);

  const [guessInput, setGuessInput] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const [guess, setGuess] = React.useState<GuessState>({
    targetName: "",
    targetPokemon: null,
    clues: [],
    guesses: [],
    attempts: 0,
    status: "idle",
    message: ""
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, "guess");
    } catch {
      // ignore
    }
    document.documentElement.classList.add("guess-mode");
    document.body.classList.add("guess-mode");
    shell.setHeader({ category: "GuessDex" });
    shell.setHelp({ title: "GuessDex", body: buildGuessHelpBody() });
    return () => {
      document.documentElement.classList.remove("guess-mode");
      document.body.classList.remove("guess-mode");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    shell.setScoreboard(
      <div className="score-pill">
        <span>Wins</span> <span>{guessStats.wins}</span> - <span>Streak</span>{" "}
        <span>{guessStats.streak}</span>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guessStats.streak, guessStats.wins]);

  React.useEffect(() => {
    shell.setStatus(getGuessStatusLabel(guess));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guess]);

  const startGuessRound = React.useCallback(async () => {
    const token = ++roundTokenRef.current;
    setSubmitting(false);
    setGuessInput("");
    setGuess({
      targetName: "",
      targetPokemon: null,
      clues: [],
      guesses: [],
      attempts: 0,
      status: "loading",
      message: "Loading a new round…"
    });

    const genIds = unique(filters.gens).filter((genId) => genId >= 1 && genId <= 9);
    if (!genIds.length) {
      setRoster([]);
      lookupRef.current = new Map();
      setGuess((prev) => ({
        ...prev,
        status: "empty",
        message: "Select at least one generation to start GuessDex."
      }));
      return;
    }

    try {
      const rosters = await Promise.all(
        genIds
          .slice()
          .sort((a, b) => a - b)
          .map((genId) =>
            queryClient.fetchQuery<string[]>({
              queryKey: ["generation-roster", genId],
              queryFn: () => fetchGenerationRoster(genId)
            })
          )
      );
      if (token !== roundTokenRef.current) return;

      const nextRoster = unique(rosters.flat());
      setRoster(nextRoster);
      lookupRef.current = buildRosterLookup(nextRoster);

      if (!nextRoster.length) {
        setGuess((prev) => ({
          ...prev,
          status: "empty",
          message: "Select at least one generation to start GuessDex."
        }));
        return;
      }

      let targetName = nextRoster[Math.floor(Math.random() * nextRoster.length)];
      if (nextRoster.length > 1 && targetName === lastTargetRef.current) {
        const alternatives = nextRoster.filter((name) => name !== lastTargetRef.current);
        targetName =
          alternatives[Math.floor(Math.random() * alternatives.length)] || targetName;
      }

      const targetPokemon = await queryClient.fetchQuery<Pokemon>({
        queryKey: ["pokemon", targetName],
        queryFn: () => fetchPokemon(targetName)
      });
      if (token !== roundTokenRef.current) return;

      lastTargetRef.current = targetName;
      setGuess({
        targetName,
        targetPokemon,
        clues: buildGuessCluePlan(targetPokemon),
        guesses: [],
        attempts: 0,
        status: "playing",
        message: "New round started. Guess the Pokemon."
      });
    } catch {
      if (token !== roundTokenRef.current) return;
      setRoster([]);
      lookupRef.current = new Map();
      setGuess((prev) => ({
        ...prev,
        status: "empty",
        message: "Unable to load a round right now. Try again."
      }));
    }
  }, [filters.gens, queryClient]);

  React.useEffect(() => {
    void startGuessRound();
  }, [startGuessRound]);

  const toggleGen = (genId: number) => {
    setFilters((prev) => {
      const next = new Set(prev.gens);
      if (next.has(genId)) next.delete(genId);
      else next.add(genId);
      return { ...prev, gens: Array.from(next).sort((a, b) => a - b) };
    });
  };

  const isFinished = guess.status === "won" || guess.status === "lost";
  const isPlayable = guess.status === "playing" && Boolean(guess.targetPokemon);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!isPlayable || !guess.targetPokemon) {
      setGuess((prev) => ({ ...prev, message: "Start a round first." }));
      return;
    }

    const rawValue = guessInput;
    const token = normalizeGuessToken(rawValue);
    if (!token) {
      setGuess((prev) => ({ ...prev, message: "Enter a Pokemon name." }));
      return;
    }

    const canonicalName = lookupRef.current.get(token);
    if (!canonicalName) {
      setGuess((prev) => ({
        ...prev,
        message: "That Pokemon is not in the selected generations."
      }));
      return;
    }

    if (guess.guesses.some((entry) => entry.rawName === canonicalName)) {
      setGuess((prev) => ({ ...prev, message: "You already guessed that Pokemon." }));
      return;
    }

    const roundToken = roundTokenRef.current;
    setSubmitting(true);

    try {
      const guessedPokemon = await queryClient.fetchQuery<Pokemon>({
        queryKey: ["pokemon", canonicalName],
        queryFn: () => fetchPokemon(canonicalName)
      });
      if (roundToken !== roundTokenRef.current) return;

      const feedback = compareGuessPokemon(guessedPokemon, guess.targetPokemon);
      const nextGuesses = [...guess.guesses, feedback];
      const attempts = nextGuesses.length;

      setGuessInput("");

      if (feedback.isCorrect) {
        setGuess({
          ...guess,
          guesses: nextGuesses,
          attempts,
          status: "won",
          message: `Correct! ${guess.targetPokemon.name} in ${attempts}/${GUESS_MAX_ATTEMPTS}.`
        });
        setGuessStats((prev) => {
          const streak = prev.streak + 1;
          return {
            played: prev.played + 1,
            wins: prev.wins + 1,
            streak,
            bestStreak: Math.max(prev.bestStreak, streak)
          };
        });
        return;
      }

      if (attempts >= GUESS_MAX_ATTEMPTS) {
        setGuess({
          ...guess,
          guesses: nextGuesses,
          attempts,
          status: "lost",
          message: `Out of guesses. It was ${guess.targetPokemon.name}.`
        });
        setGuessStats((prev) => ({
          played: prev.played + 1,
          wins: prev.wins,
          streak: 0,
          bestStreak: prev.bestStreak
        }));
        return;
      }

      const remaining = GUESS_MAX_ATTEMPTS - attempts;
      setGuess({
        ...guess,
        guesses: nextGuesses,
        attempts,
        message: `Not quite. ${remaining} guess${remaining === 1 ? "" : "es"} left.`
      });
    } catch {
      if (roundToken !== roundTokenRef.current) return;
      setGuess((prev) => ({
        ...prev,
        message: "Could not load that guess. Try another Pokemon."
      }));
    } finally {
      if (roundToken === roundTokenRef.current) {
        setSubmitting(false);
      }
    }
  };

  const misses = getGuessMissCount(guess);
  let revealCount = Math.min(guess.clues.length, misses);
  if (isFinished) {
    revealCount = guess.clues.length;
  }

  const targetCategoryLabel =
    guess.targetPokemon
      ? CATEGORY_LABELS[guess.targetPokemon.category] ||
      capitalize(guess.targetPokemon.category || "standard")
      : "";

  return (
    <div className="guess-layout">
      <section className="guess-board">
        <article
          className={cn("guess-target-card", guess.targetPokemon && !isFinished && "is-concealed")}
        >
          <div className="guess-target-media">
            <img
              src={guess.targetPokemon?.images?.main || undefined}
              alt={
                guess.targetPokemon
                  ? isFinished
                    ? `${guess.targetPokemon.name} artwork`
                    : "Hidden Pokemon silhouette"
                  : "No Pokemon selected"
              }
            />
          </div>
          <div className="guess-target-copy">
            <h2>
              {!guess.targetPokemon
                ? "Pick generations to start"
                : isFinished
                  ? guess.targetPokemon.name
                  : "Who's that Pokemon?"}
            </h2>
            <p className="guess-attempts">
              {guess.attempts} / {GUESS_MAX_ATTEMPTS} guesses
            </p>
            <p className="guess-target-meta" hidden={!guess.targetPokemon || !isFinished}>
              {guess.targetPokemon
                ? `#${String(guess.targetPokemon.id).padStart(4, "0")} · ${humanizeTypeList(guess.targetPokemon.typeNames)} · ${targetCategoryLabel}`
                : ""}
            </p>
          </div>
        </article>

        <section className="guess-clues" aria-label="Progressive hints">
          <h3>Hints</h3>
          <div className="guess-clue-list">
            {!guess.targetPokemon ? (
              <p className="guess-clue-empty">Select at least one generation to start.</p>
            ) : !guess.clues.length ? (
              <p className="guess-clue-empty">Clues are loading...</p>
            ) : (
              guess.clues.map((clue, index) => {
                const unlocked = index < revealCount;
                return (
                  <div
                    key={clue.id}
                    className={cn("guess-clue", unlocked ? "is-unlocked" : "is-locked")}
                  >
                    <span className="guess-clue-key">{clue.label}</span>
                    <span className="guess-clue-value">{unlocked ? clue.value : "Locked"}</span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <form className="guess-form" autoComplete="off" onSubmit={onSubmit}>
          <label className="guess-label" htmlFor="guessInput">
            Make a guess
          </label>
          <div className="guess-form-row">
            <input
              id="guessInput"
              name="guessInput"
              type="text"
              list="guessNameList"
              autoComplete="off"
              spellCheck={false}
              placeholder="Try: Pikachu"
              value={guessInput}
              onChange={(event) => setGuessInput(event.target.value)}
              disabled={!isPlayable}
            />
            <button
              className="action smash guess-submit"
              type="submit"
              disabled={!isPlayable || submitting}
            >
              Guess
            </button>
          </div>
          <datalist id="guessNameList">
            {roster.map((name) => (
              <option key={name} value={capitalize(name)} />
            ))}
          </datalist>
        </form>

        <p className="guess-live" aria-live="polite">
          {guess.message || ""}
        </p>

        <div className="guess-round-actions">
          <button
            className="action shuffle"
            type="button"
            hidden={!isFinished}
            onClick={() => void startGuessRound()}
          >
            Next Pokemon
          </button>
        </div>
      </section>

      <section className="guess-results-panel">
        <div className="guess-results-header">
          <h2>Guess feedback</h2>
          <p>Exact match, partial overlap, and directional hints.</p>
        </div>
        <section className="guess-gens guess-gens-side" aria-label="GuessDex generation filters">
          <h3>Generation pool</h3>
          <div className="gen-grid guess-gen-grid" id="guessGenGrid">
            {Array.from({ length: GEN_TOTAL }, (_, i) => i + 1).map((genId) => (
              <label key={genId} className="gen-option">
                <input
                  type="checkbox"
                  value={String(genId)}
                  checked={filters.gens.includes(genId)}
                  onChange={() => toggleGen(genId)}
                />
                <span>Gen {genId}</span>
              </label>
            ))}
          </div>
        </section>
        <div className="guess-legend" aria-label="Feedback legend">
          <span className="guess-legend-chip exact">Exact</span>
          <span className="guess-legend-chip partial">Partial</span>
          <span className="guess-legend-chip direction">Direction</span>
          <span className="guess-legend-chip miss">Miss</span>
        </div>
        <div className="guess-grid-head">
          <span>Name</span>
          <span>Gen</span>
          <span>Type</span>
          <span>Height</span>
          <span>Weight</span>
          <span>BST</span>
          <span>Category</span>
        </div>
        <div className="guess-history">
          {!guess.guesses.length ? (
            <p className="guess-history-empty">No guesses yet.</p>
          ) : (
            guess.guesses.map((guessRow) => (
              <div
                key={guessRow.rawName}
                className={cn("guess-row", guessRow.isCorrect && "is-correct")}
              >
                {(
                  [
                    ["name", "Name"],
                    ["generation", "Gen"],
                    ["type", "Type"],
                    ["height", "Height"],
                    ["weight", "Weight"],
                    ["bst", "BST"],
                    ["category", "Category"]
                  ] as const
                ).map(([key, label]) => {
                  const cellData = (guessRow.cells as any)[key] as { state: string; label: string };
                  return (
                    <span
                      key={key}
                      className={`guess-cell guess-cell-${cellData.state || "miss"}`}
                      data-col={label}
                    >
                      {cellData.label}
                    </span>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
