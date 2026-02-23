import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useShell } from "@/app/providers/ShellProvider";
import { useLocalStorageState } from "@/lib/storage";
import { fetchGenerationRoster, fetchPokemon } from "@/lib/pokeapi/api";
import { usePokemon } from "@/lib/pokeapi/hooks";
import { TYPE_LIST, typeEffectiveness } from "@/lib/typeChart";
import { capitalize } from "@/lib/text";
import { cn } from "@/lib/utils";
import type { Pokemon } from "@/lib/pokeapi/types";
import {
  DEFAULT_FEEDBACK,
  TYPE_CLASH_KEY,
  defaultTypeClashSnapshot,
  parseTypeClashSnapshot,
  type TypeClashHistoryEntry,
  type TypeClashRoundSnapshot,
  type TypeClashSnapshot
} from "@/games/type-clash/typeClashStorage";

const ROSTER_GENS = [1, 2, 3, 4];
const FALLBACK_NAMES = ["bulbasaur", "charmander", "squirtle", "pikachu", "eevee", "snorlax"];
const HISTORY_LIMIT = 8;

const unique = <T,>(items: T[]) => Array.from(new Set((items || []).filter(Boolean)));

const pickRandom = <T,>(items: T[]) => {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
};

const formatMultiplier = (value: number) => {
  if (!Number.isFinite(value)) return "0x";
  if (Number.isInteger(value)) return `${value}x`;
  return `${value.toFixed(2).replace(/\\.?0+$/, "")}x`;
};

export const TypeClashPage = () => {
  const shell = useShell();
  const queryClient = useQueryClient();

  const initialSnapshot = React.useMemo(() => defaultTypeClashSnapshot(), []);
  const [snapshot, setSnapshot] = useLocalStorageState<TypeClashSnapshot>(
    TYPE_CLASH_KEY,
    initialSnapshot,
    { parse: parseTypeClashSnapshot }
  );

  const [busy, setBusy] = React.useState(false);
  const rosterRef = React.useRef<string[]>([]);
  const requestRef = React.useRef(0);

  const round = snapshot.round;
  const [leftName, rightName] = round?.optionNames ?? ["", ""];
  const leftQuery = usePokemon(leftName);
  const rightQuery = usePokemon(rightName);
  const leftPokemon = leftQuery.data ?? null;
  const rightPokemon = rightQuery.data ?? null;

  React.useEffect(() => {
    shell.setHeader({ category: "Type Clash" });
    shell.setHelp({
      title: "Type Clash",
      body: (
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">Goal</span>
            <span className="text-muted-foreground">Pick the bigger hit</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">Scoring</span>
            <span className="text-muted-foreground">+1 per correct</span>
          </div>
        </div>
      )
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    shell.setScoreboard(
      <div className="score-pill">
        <span>Score</span> <span>{snapshot.score}</span> - <span>Streak</span>{" "}
        <span>{snapshot.streak}</span>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.score, snapshot.streak]);

  React.useEffect(() => {
    shell.setStatus(busy ? "Type Clash: loading matchup…" : "Type Clash: Ready");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  const ensureRoster = React.useCallback(async () => {
    if (rosterRef.current.length) return rosterRef.current;
    const lists = await Promise.all(
      ROSTER_GENS.map((genId) =>
        queryClient
          .fetchQuery<string[]>({
            queryKey: ["generation-roster", genId],
            queryFn: () => fetchGenerationRoster(genId)
          })
          .catch(() => [] as string[])
      )
    );
    const names = unique(lists.flat());
    rosterRef.current = names.length ? names : [...FALLBACK_NAMES];
    return rosterRef.current;
  }, [queryClient]);

  const buildRound = React.useCallback(async () => {
    const requestId = ++requestRef.current;
    setBusy(true);
    setSnapshot((prev) => ({
      ...prev,
      selectedIndex: null,
      revealed: false,
      feedback: "Loading matchup…"
    }));

    try {
      const roster = await ensureRoster();
      let created: { round: TypeClashRoundSnapshot } | null = null;

      for (let attempt = 0; attempt < 40; attempt += 1) {
        const attackType = pickRandom(TYPE_LIST);
        if (!attackType) continue;
        const left = pickRandom(roster);
        const right = pickRandom(roster.filter((name) => name !== left));
        if (!left || !right) continue;

        const [leftPokemon, rightPokemon] = await Promise.all([
          queryClient.fetchQuery<Pokemon>({
            queryKey: ["pokemon", left],
            queryFn: () => fetchPokemon(left)
          }),
          queryClient.fetchQuery<Pokemon>({
            queryKey: ["pokemon", right],
            queryFn: () => fetchPokemon(right)
          })
        ]);
        if (!leftPokemon || !rightPokemon || leftPokemon.id === rightPokemon.id) continue;

        const multipliers = [
          typeEffectiveness(attackType, leftPokemon.typeNames),
          typeEffectiveness(attackType, rightPokemon.typeNames)
        ] as const;
        if (multipliers[0] === multipliers[1]) continue;

        const correctIndex = multipliers[0] > multipliers[1] ? 0 : 1;
        created = {
          round: {
            attackType,
            optionNames: [leftPokemon.rawName, rightPokemon.rawName],
            multipliers: [multipliers[0], multipliers[1]],
            correctIndex
          }
        };
        break;
      }

      if (!created) throw new Error("Could not create a Type Clash round.");
      if (requestId !== requestRef.current) return;

      setSnapshot((prev) => ({
        ...prev,
        round: created!.round,
        revealed: false,
        selectedIndex: null,
        feedback: DEFAULT_FEEDBACK
      }));
    } catch (error) {
      if (requestId !== requestRef.current) return;
      if (import.meta.env.DEV) console.error(error);
      setSnapshot((prev) => ({
        ...prev,
        round: null,
        revealed: false,
        selectedIndex: null,
        feedback: "Could not load matchup. Try Next Round."
      }));
    } finally {
      if (requestId === requestRef.current) {
        setBusy(false);
      }
    }
  }, [ensureRoster, queryClient, setSnapshot]);

  React.useEffect(() => {
    if (!snapshot.round) {
      void buildRound();
    }
  }, [buildRound, snapshot.round]);

  const applyChoice = (index: 0 | 1) => {
    if (!snapshot.round || snapshot.revealed || busy) return;
    if (!leftPokemon || !rightPokemon) return;

    setSnapshot((prev) => {
      if (!prev.round) return prev;

      const picked = index;
      const correct = picked === prev.round.correctIndex;

      const nextScore = prev.score + (correct ? 1 : 0);
      const nextCorrect = prev.correct + (correct ? 1 : 0);
      const nextRounds = prev.rounds + 1;
      const nextStreak = correct ? prev.streak + 1 : 0;
      const nextBest = Math.max(prev.bestStreak, nextStreak);

      const options: [Pokemon, Pokemon] = [leftPokemon, rightPokemon];
      const pickedPokemon = options[picked];
      const correctPokemon = options[prev.round.correctIndex];

      const historyEntry: TypeClashHistoryEntry = {
        attackType: prev.round.attackType,
        pickedName: pickedPokemon?.name || "Unknown",
        correctName: correctPokemon?.name || "Unknown",
        correct
      };

      return {
        ...prev,
        score: nextScore,
        correct: nextCorrect,
        rounds: nextRounds,
        streak: nextStreak,
        bestStreak: nextBest,
        selectedIndex: picked,
        revealed: true,
        feedback: correct
          ? "Correct. You read the matchup."
          : "Missed. Check multipliers, then run it back.",
        history: [historyEntry, ...prev.history].slice(0, HISTORY_LIMIT)
      };
    });
  };

  const resetScore = () => {
    setSnapshot(defaultTypeClashSnapshot());
    void buildRound();
  };

  const accuracy = snapshot.rounds ? Math.round((snapshot.correct / snapshot.rounds) * 100) : 0;

  return (
    <section className="game-panel type-clash-game">
      <section className="arcade-card type-clash-stats">
        <div className="arcade-metrics">
          <span className="arcade-chip">
            Score <strong>{snapshot.score}</strong>
          </span>
          <span className="arcade-chip">
            Rounds <strong>{snapshot.rounds}</strong>
          </span>
          <span className="arcade-chip">
            Accuracy <strong>{accuracy}%</strong>
          </span>
          <span className="arcade-chip">
            Streak <strong>{snapshot.streak}</strong>
          </span>
          <span className="arcade-chip">
            Best <strong>{snapshot.bestStreak}</strong>
          </span>
        </div>
      </section>

      <section className="arcade-card type-clash-board">
        <p className="type-clash-kicker">Type Matchup Drill</p>
        <h2>
          {snapshot.round
            ? `Which Pokemon takes more damage from ${capitalize(snapshot.round.attackType)}-type attacks?`
            : "Build a matchup to begin."}
        </h2>

        <div className="type-clash-options">
          {snapshot.round && leftPokemon && rightPokemon ? (
            ([leftPokemon, rightPokemon] as const).map((pokemon, index) => {
              const isCorrect = snapshot.revealed && index === snapshot.round!.correctIndex;
              const isWrong =
                snapshot.revealed &&
                snapshot.selectedIndex === index &&
                index !== snapshot.round!.correctIndex;
              const wasPicked = snapshot.revealed && snapshot.selectedIndex === index;

              return (
                <button
                  key={pokemon.rawName}
                  type="button"
                  className={cn(
                    "type-clash-option",
                    wasPicked && "was-picked",
                    isCorrect && "is-correct",
                    isWrong && "is-wrong"
                  )}
                  disabled={busy || !snapshot.round}
                  onClick={() => applyChoice(index as 0 | 1)}
                >
                  <div className="arcade-media type-clash-media">
                    {pokemon.thumb || pokemon.images.main ? (
                      <img
                        src={pokemon.thumb || pokemon.images.main}
                        alt={pokemon.name}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="type-clash-fallback">No art</span>
                    )}
                  </div>
                  <div className="type-clash-option-meta">
                    <h3>{pokemon.name}</h3>
                    <p className="type-clash-types">
                      {(pokemon.typeNames || []).map((name) => capitalize(name)).join(" / ") ||
                        "Unknown typing"}
                    </p>
                    {snapshot.revealed && snapshot.round ? (
                      <p className="type-clash-multiplier">
                        {formatMultiplier(snapshot.round.multipliers[index])} damage
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })
          ) : snapshot.round ? (
            <p className="type-clash-placeholder">Loading matchup…</p>
          ) : (
            <p className="type-clash-placeholder">No matchup available.</p>
          )}
        </div>

        <p className={cn("type-clash-feedback", busy && "is-busy")} aria-live="polite">{snapshot.feedback}</p>
      </section>

      <section className="arcade-card type-clash-controls">
        <div className="arcade-options">
          <button type="button" className="arcade-btn" onClick={() => void buildRound()} disabled={busy}>
            Next Round
          </button>
          <button type="button" className="arcade-btn-ghost" onClick={resetScore} disabled={busy}>
            Reset Score
          </button>
        </div>
      </section>

      <section className="arcade-card type-clash-history-card">
        <h3>Recent Calls</h3>
        <ol className="type-clash-history">
          {!snapshot.history.length ? (
            <li className="type-clash-history-empty">No rounds yet.</li>
          ) : (
            snapshot.history.map((entry, idx) => (
              <li key={`${entry.attackType}-${idx}`} className={entry.correct ? "is-correct" : "is-wrong"}>
                {`${capitalize(entry.attackType)}: picked ${entry.pickedName}, answer ${entry.correctName}`}
              </li>
            ))
          )}
        </ol>
      </section>
    </section>
  );
};
