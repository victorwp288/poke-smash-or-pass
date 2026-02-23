import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useShell } from "@/app/providers/ShellProvider";
import { useLocalStorageState } from "@/lib/storage";
import { capitalize, formatId } from "@/lib/text";
import { cn } from "@/lib/utils";
import { fetchGenerationRoster, fetchPokemon } from "@/lib/pokeapi/api";
import type { Pokemon } from "@/lib/pokeapi/types";
import {
  SILHOUETTE_BLITZ_KEY,
  createDefaultSilhouetteState,
  parseSilhouetteSnapshot,
  type SilhouetteBlitzSnapshot,
  type SilhouetteCandidate,
  type SilhouetteHistoryEntry,
  type SilhouetteTone
} from "@/games/silhouette-blitz/silhouetteBlitzStorage";

const ROUND_SECONDS = 12;
const MAX_HISTORY = 10;
const ROSTER_GENS = [1, 2, 3, 4];
const FALLBACK_NAMES = ["pikachu", "bulbasaur", "charmander", "squirtle", "togepi", "eevee"];

const unique = <T,>(items: T[]) => Array.from(new Set((items || []).filter(Boolean)));

const pickMany = <T,>(items: T[], count: number) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
};

const pickRandom = <T,>(items: T[]) => {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const feedbackClass = (tone: SilhouetteTone) => {
  switch (tone) {
    case "success":
      return "silhouette-blitz-feedback is-success";
    case "warning":
      return "silhouette-blitz-feedback is-warning";
    case "danger":
      return "silhouette-blitz-feedback is-danger";
    default:
      return "silhouette-blitz-feedback";
  }
};

const compactPokemon = (pokemon: Pokemon): SilhouetteCandidate => ({
  rawName: pokemon.rawName,
  display: pokemon.name,
  id: pokemon.id,
  sprite: pokemon.thumb || pokemon.images.main,
  typeNames: (pokemon.typeNames || []).slice(0, 2)
});

export const SilhouetteBlitzPage = () => {
  const shell = useShell();
  const queryClient = useQueryClient();

  const initialSnapshot = React.useMemo(() => createDefaultSilhouetteState(), []);
  const [snapshot, setSnapshot] = useLocalStorageState<SilhouetteBlitzSnapshot>(
    SILHOUETTE_BLITZ_KEY,
    initialSnapshot,
    { parse: parseSilhouetteSnapshot }
  );
  const snapshotRef = React.useRef(snapshot);
  snapshotRef.current = snapshot;

  const rosterRef = React.useRef<string[]>([]);
  const [clock, setClock] = React.useState(Date.now());

  React.useEffect(() => {
    shell.setHeader({ category: "Silhouette Blitz" });
    shell.setHelp({
      title: "Silhouette Blitz",
      body: (
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">Goal</span>
            <span className="text-muted-foreground">Pick the silhouette fast</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">Timer</span>
            <span className="text-muted-foreground">{ROUND_SECONDS}s per round</span>
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

  const isActiveRound =
    Boolean(snapshot.round) &&
    !snapshot.round?.resolved &&
    !snapshot.loading &&
    Boolean(snapshot.roundEndsAt);

  const timeLeft = snapshot.roundEndsAt
    ? Math.max(0, Math.ceil(((snapshot.roundEndsAt as number) - clock) / 1000))
    : ROUND_SECONDS;

  React.useEffect(() => {
    shell.setStatus(
      isActiveRound ? `Silhouette Blitz: ${timeLeft}s left` : "Silhouette Blitz: Ready"
    );
  }, [isActiveRound, shell, timeLeft]);

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
    const names = unique(lists.flat()).map((name) => String(name).toLowerCase());
    rosterRef.current = names.length ? names : [...FALLBACK_NAMES];
    return rosterRef.current;
  }, [queryClient]);

  const buildRound = React.useCallback(async () => {
    const roster = await ensureRoster();
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const picks = pickMany(roster, 4);
      if (picks.length < 4) continue;

      const candidates = await Promise.all(
        picks.map(async (name) => {
          try {
            const pokemon = await queryClient.fetchQuery<Pokemon>({
              queryKey: ["pokemon", name],
              queryFn: () => fetchPokemon(name)
            });
            const compact = compactPokemon(pokemon);
            return compact.sprite ? compact : null;
          } catch {
            return null;
          }
        })
      );

      const clean = candidates.filter(Boolean) as SilhouetteCandidate[];
      if (clean.length < 4) continue;

      const correct = pickRandom(clean);
      if (!correct) continue;

      return {
        candidates: clean,
        correctName: correct.rawName,
        selectedName: "",
        resolved: false,
        timedOut: false
      };
    }
    throw new Error("Unable to build silhouette round");
  }, [ensureRoster, queryClient]);

  const queueRound = React.useCallback(async () => {
    if (snapshot.loading) return;
    setSnapshot((prev) => ({
      ...prev,
      loading: true,
      feedback: { tone: "neutral", message: "Preparing a new silhouette…" }
    }));

    try {
      const round = await buildRound();
      setSnapshot((prev) => ({
        ...prev,
        loading: false,
        round,
        roundEndsAt: Date.now() + ROUND_SECONDS * 1000,
        feedback: { tone: "neutral", message: "Pick fast. Timer is live." }
      }));
      setClock(Date.now());
    } catch (error) {
      if (import.meta.env.DEV) console.error(error);
      setSnapshot((prev) => ({
        ...prev,
        loading: false,
        roundEndsAt: null,
        feedback: { tone: "danger", message: "Could not create a silhouette round. Try again." }
      }));
    }
  }, [buildRound, setSnapshot, snapshot.loading]);

  const concludeTimeout = React.useCallback(() => {
    setSnapshot((prev) => {
      if (!prev.round || prev.round.resolved) return prev;

      const answer =
        prev.round.candidates.find(
          (candidate) => candidate.rawName === prev.round!.correctName
        ) || null;

      const nextScore = clamp(prev.score - 2, 0, 999999);
      const historyEntry: SilhouetteHistoryEntry = {
        result: "loss",
        answer: prev.round.correctName,
        selected: "",
        scoreDelta: -2
      };

      return {
        ...prev,
        score: nextScore,
        streak: 0,
        roundsPlayed: prev.roundsPlayed + 1,
        round: { ...prev.round, resolved: true, timedOut: true, selectedName: "" },
        feedback: {
          tone: "danger",
          message: `Time up. It was ${answer?.display || capitalize(prev.round.correctName)}.`
        },
        history: [historyEntry, ...prev.history].slice(0, MAX_HISTORY)
      };
    });
  }, [setSnapshot]);

  React.useEffect(() => {
    if (!isActiveRound) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setClock(now);
      const endsAt = snapshotRef.current.roundEndsAt;
      if (endsAt && now >= endsAt) concludeTimeout();
    }, 250);
    return () => window.clearInterval(id);
  }, [concludeTimeout, isActiveRound]);

  React.useEffect(() => {
    if (!snapshot.round) {
      void queueRound();
    }
  }, [queueRound, snapshot.round]);

  const resolveGuess = (name: string) => {
    const normalized = String(name || "").toLowerCase();
    setSnapshot((prev) => {
      if (!prev.round || prev.round.resolved || prev.loading) return prev;
      const picked =
        prev.round.candidates.find((candidate) => candidate.rawName === normalized) ||
        null;
      if (!picked) return prev;

      const answer =
        prev.round.candidates.find(
          (candidate) => candidate.rawName === prev.round!.correctName
        ) || null;

      const now = Date.now();
      const endsAt = prev.roundEndsAt ?? now;
      const remaining = clamp(Math.ceil((endsAt - now) / 1000), 0, ROUND_SECONDS);
      const elapsedSeconds = clamp(ROUND_SECONDS - remaining, 0, ROUND_SECONDS);

      const correct = normalized === prev.round.correctName;

      if (correct) {
        const delta = 7 + Math.min(prev.streak, 4);
        const nextStreak = prev.streak + 1;
        const historyEntry: SilhouetteHistoryEntry = {
          result: "win",
          answer: normalized,
          selected: normalized,
          scoreDelta: delta
        };

        return {
          ...prev,
          score: clamp(prev.score + delta, 0, 999999),
          streak: nextStreak,
          bestStreak: Math.max(prev.bestStreak, nextStreak),
          roundsPlayed: prev.roundsPlayed + 1,
          round: {
            ...prev.round,
            selectedName: normalized,
            resolved: true,
            timedOut: false
          },
          feedback: {
            tone: "success",
            message: `Correct in ${elapsedSeconds}s. +${delta} points.`
          },
          history: [historyEntry, ...prev.history].slice(0, MAX_HISTORY)
        };
      }

      const delta = -3;
      const historyEntry: SilhouetteHistoryEntry = {
        result: "loss",
        answer: prev.round.correctName,
        selected: normalized,
        scoreDelta: delta
      };

      return {
        ...prev,
        score: clamp(prev.score + delta, 0, 999999),
        streak: 0,
        roundsPlayed: prev.roundsPlayed + 1,
        round: {
          ...prev.round,
          selectedName: normalized,
          resolved: true,
          timedOut: false
        },
        feedback: {
          tone: "danger",
          message: `Not quite. You picked ${picked.display}; answer was ${answer?.display || capitalize(prev.round.correctName)}.`
        },
        history: [historyEntry, ...prev.history].slice(0, MAX_HISTORY)
      };
    });
  };

  const round = snapshot.round;
  const answer = round
    ? round.candidates.find((candidate) => candidate.rawName === round.correctName) || null
    : null;
  const progress = Math.max(0, Math.min(100, (timeLeft / ROUND_SECONDS) * 100));

  if (!round) {
    return (
      <div className="silhouette-blitz-shell arcade-stack">
        <article className="arcade-card silhouette-blitz-empty">
          <h3>Silhouette Blitz</h3>
          <p>No round loaded yet.</p>
          <button className="arcade-btn" type="button" onClick={() => void queueRound()} disabled={snapshot.loading}>
            Start Blitz
          </button>
        </article>
      </div>
    );
  }

  return (
    <div className="silhouette-blitz-shell arcade-stack">
      <article className="arcade-card silhouette-blitz-head">
        <h3>Silhouette Blitz</h3>
        <div className="arcade-metrics">
          <span className="arcade-chip">Score {snapshot.score}</span>
          <span className="arcade-chip">Streak {snapshot.streak}</span>
          <span className="arcade-chip">Best {snapshot.bestStreak}</span>
          <span className="arcade-chip">Rounds {snapshot.roundsPlayed}</span>
        </div>
        <div className="silhouette-blitz-timer-wrap">
          <div className="silhouette-blitz-timer-label">
            <span>Time</span>
            <strong>{timeLeft}s</strong>
          </div>
          <div className="silhouette-blitz-timer-track">
            <span className="silhouette-blitz-timer-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <p className={feedbackClass(snapshot.feedback.tone)} aria-live="polite">{snapshot.feedback.message}</p>
      </article>

      <section className="silhouette-blitz-stage arcade-grid">
        <article className="arcade-card silhouette-blitz-figure">
          <div className="arcade-media silhouette">
            <img src={answer?.sprite || ""} alt="Silhouette" loading="lazy" decoding="async" />
          </div>
          {round.resolved ? <h4>{answer?.display || capitalize(round.correctName)}</h4> : <h4>Who is this Pokemon?</h4>}
          {round.resolved ? <p>{formatId(answer?.id || 0)}</p> : null}
        </article>

        <article className="arcade-card silhouette-blitz-options-wrap">
          <h4>Choices</h4>
          <div className="silhouette-blitz-options">
            {round.candidates.map((candidate) => {
              const selected = round.selectedName === candidate.rawName;
              const correct = round.correctName === candidate.rawName;
              const classes = ["silhouette-blitz-option"];
              if (round.resolved && correct) classes.push("is-correct");
              if (round.resolved && selected && !correct) classes.push("is-wrong");
              return (
                <button
                  key={candidate.rawName}
                  className={classes.join(" ")}
                  type="button"
                  disabled={round.resolved || snapshot.loading}
                  onClick={() => resolveGuess(candidate.rawName)}
                >
                  <span>{candidate.display}</span>
                  <small>{formatId(candidate.id)}</small>
                </button>
              );
            })}
          </div>
          <div className="silhouette-blitz-actions">
            <button className="arcade-btn" type="button" onClick={() => void queueRound()} disabled={snapshot.loading}>
              Next Silhouette
            </button>
          </div>
        </article>
      </section>

      <article className="arcade-card">
        <h3>Recent Blitz Rounds</h3>
        <ul className="silhouette-blitz-history">
          {snapshot.history.length ? (
            snapshot.history.map((entry, idx) => (
              <li key={`${entry.answer}-${idx}`}>
                <span className={cn("silhouette-blitz-history-result", entry.result === "win" ? "is-win" : "is-loss")}>
                  {entry.result === "win" ? "Win" : "Loss"}
                </span>
                <span>{capitalize(entry.answer)}</span>
                <span>{entry.scoreDelta > 0 ? `+${entry.scoreDelta}` : entry.scoreDelta}</span>
              </li>
            ))
          ) : (
            <li className="is-empty">No rounds completed yet.</li>
          )}
        </ul>
      </article>
    </div>
  );
};
