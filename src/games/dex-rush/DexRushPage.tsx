import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useShell } from "@/app/providers/ShellProvider";
import { useLocalStorageState } from "@/lib/storage";
import { fetchGenerationRoster, fetchPokemon } from "@/lib/pokeapi/api";
import { usePokemon } from "@/lib/pokeapi/hooks";
import { capitalize } from "@/lib/text";
import { cn } from "@/lib/utils";
import type { Pokemon } from "@/lib/pokeapi/types";
import {
  DEX_RUSH_KEY,
  defaultDexRushSnapshot,
  parseDexRushSnapshot,
  type DexRushHistoryEntry,
  type DexRushSnapshot
} from "@/games/dex-rush/dexRushStorage";

const ROSTER_GENS = [1, 2, 3, 4, 5];
const FALLBACK_NAMES = ["bulbasaur", "chikorita", "treecko", "piplup", "snivy", "pikachu"];
const RUSH_DURATION_MS = 60000;
const HISTORY_LIMIT = 10;

const unique = <T,>(items: T[]) => Array.from(new Set((items || []).filter(Boolean)));

const pickRandom = <T,>(items: T[]) => {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
};

const formatTimer = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const padDex = (dex: number) => `#${String(dex || 0).padStart(4, "0")}`;

export const DexRushPage = () => {
  const shell = useShell();
  const queryClient = useQueryClient();

  const initialSnapshot = React.useMemo(() => defaultDexRushSnapshot(), []);
  const [snapshot, setSnapshot] = useLocalStorageState<DexRushSnapshot>(
    DEX_RUSH_KEY,
    initialSnapshot,
    { parse: parseDexRushSnapshot }
  );

  const rosterRef = React.useRef<string[]>([]);
  const requestRef = React.useRef(0);
  const [busy, setBusy] = React.useState(false);
  const [clock, setClock] = React.useState(Date.now());

  React.useEffect(() => {
    shell.setHeader({ category: "Dex Rush" });
    shell.setHelp({
      title: "Dex Rush",
      body: (
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">Goal</span>
            <span className="text-muted-foreground">Score in 60 seconds</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">Controls</span>
            <span className="text-muted-foreground">Higher / Lower</span>
          </div>
        </div>
      )
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    shell.setScoreboard(
      <div className="score-pill">
        <span>Score</span> <span>{snapshot.score}</span> - <span>Rounds</span>{" "}
        <span>{snapshot.rounds}</span>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.rounds, snapshot.score]);

  const remainingMs = snapshot.timerEndsAt
    ? Math.max(0, snapshot.timerEndsAt - clock)
    : RUSH_DURATION_MS;

  React.useEffect(() => {
    if (!snapshot.playing || !snapshot.timerEndsAt) return;
    const endsAt = snapshot.timerEndsAt;
    const id = window.setInterval(() => {
      const now = Date.now();
      setClock(now);
      if (now >= endsAt) {
        setSnapshot((prev) => ({
          ...prev,
          playing: false,
          timerEndsAt: endsAt,
          feedback: `Time. Final score ${prev.score}/${prev.rounds}.`
        }));
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [setSnapshot, snapshot.playing, snapshot.timerEndsAt]);

  React.useEffect(() => {
    shell.setStatus(
      snapshot.playing ? `Dex Rush: ${formatTimer(remainingMs)}` : "Dex Rush: Ready"
    );
  }, [remainingMs, shell, snapshot.playing]);

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

  const getPokemon = React.useCallback(
    async (nameOrId: string) => {
      const key = String(nameOrId || "").toLowerCase();
      if (!key) return null;
      return queryClient.fetchQuery<Pokemon>({
        queryKey: ["pokemon", key],
        queryFn: () => fetchPokemon(key)
      });
    },
    [queryClient]
  );

  const createPair = React.useCallback(
    async (currentPokemon: Pokemon | null = null) => {
      const roster = await ensureRoster();
      let current = currentPokemon;
      if (!current) {
        const firstName = pickRandom(roster);
        current = firstName ? await getPokemon(firstName) : null;
      }
      if (!current) throw new Error("Unable to create current Pokemon.");

      for (let attempt = 0; attempt < 60; attempt += 1) {
        const nextName = pickRandom(roster);
        if (!nextName) continue;
        const next = await getPokemon(nextName);
        if (!next || next.id === current.id) continue;
        return { current, next };
      }
      throw new Error("Unable to create next Pokemon.");
    },
    [ensureRoster, getPokemon]
  );

  const startRush = React.useCallback(async () => {
    const requestId = ++requestRef.current;
    setBusy(true);
    setSnapshot((prev) => ({ ...prev, feedback: "Loading rush…" }));

    try {
      const pair = await createPair();
      if (requestId !== requestRef.current || !pair) return;
      const endsAt = Date.now() + RUSH_DURATION_MS;
      setSnapshot({
        score: 0,
        rounds: 0,
        streak: 0,
        bestStreak: 0,
        round: { currentName: pair.current.rawName, nextName: pair.next.rawName },
        revealed: false,
        guess: "",
        feedback: "Will the next Pokemon have a higher or lower Dex number?",
        history: [],
        playing: true,
        timerEndsAt: endsAt
      });
      setClock(Date.now());
    } catch (error) {
      if (import.meta.env.DEV) console.error(error);
      if (requestId !== requestRef.current) return;
      setSnapshot((prev) => ({
        ...prev,
        playing: false,
        timerEndsAt: null,
        feedback: "Could not start rush. Try again."
      }));
    } finally {
      if (requestId === requestRef.current) setBusy(false);
    }
  }, [createPair, setSnapshot]);

  const continueRush = React.useCallback(async () => {
    if (!snapshot.playing || !snapshot.round) return;
    const requestId = ++requestRef.current;
    setBusy(true);
    setSnapshot((prev) => ({ ...prev, feedback: "Loading next duel…" }));

    try {
      const nextCurrent = await getPokemon(snapshot.round.nextName);
      const pair = await createPair(nextCurrent);
      if (requestId !== requestRef.current || !pair) return;

      setSnapshot((prev) => ({
        ...prev,
        round: { currentName: pair.current.rawName, nextName: pair.next.rawName },
        revealed: false,
        guess: "",
        feedback: "Will the next Pokemon have a higher or lower Dex number?"
      }));
    } catch (error) {
      if (import.meta.env.DEV) console.error(error);
      if (requestId !== requestRef.current) return;
      setSnapshot((prev) => ({ ...prev, feedback: "Could not load next duel." }));
    } finally {
      if (requestId === requestRef.current) setBusy(false);
    }
  }, [createPair, getPokemon, setSnapshot, snapshot.playing, snapshot.round]);

  const round = snapshot.round;
  const [currentName, nextName] = round ? [round.currentName, round.nextName] : ["", ""];
  const currentQuery = usePokemon(currentName);
  const nextQuery = usePokemon(nextName);
  const currentPokemon = currentQuery.data ?? null;
  const nextPokemon = nextQuery.data ?? null;

  const makeGuess = (direction: "higher" | "lower") => {
    if (!snapshot.playing || busy || snapshot.revealed || !snapshot.round) return;
    if (!currentPokemon || !nextPokemon) return;

    const currentDex = Number(currentPokemon.id) || 0;
    const nextDex = Number(nextPokemon.id) || 0;
    const expected: "higher" | "lower" = nextDex > currentDex ? "higher" : "lower";
    const correct = direction === expected;

    setSnapshot((prev) => {
      const nextRounds = prev.rounds + 1;
      const nextScore = prev.score + (correct ? 1 : 0);
      const nextStreak = correct ? prev.streak + 1 : 0;
      const nextBest = Math.max(prev.bestStreak, nextStreak);

      const entry: DexRushHistoryEntry = {
        guess: direction,
        expected,
        correct,
        name: nextPokemon.name,
        dex: nextPokemon.id
      };

      return {
        ...prev,
        rounds: nextRounds,
        score: nextScore,
        streak: nextStreak,
        bestStreak: nextBest,
        revealed: true,
        guess: direction,
        feedback: correct
          ? `Correct. ${nextPokemon.name} is #${nextPokemon.id}.`
          : `Missed. ${nextPokemon.name} is #${nextPokemon.id}.`,
        history: [entry, ...prev.history].slice(0, HISTORY_LIMIT)
      };
    });
  };

  const canGuess =
    snapshot.playing &&
    !snapshot.revealed &&
    !busy &&
    Boolean(snapshot.round) &&
    Boolean(currentPokemon) &&
    Boolean(nextPokemon);

  return (
    <section className="game-panel dex-rush-game">
      <section className="arcade-card dex-rush-stats">
        <div className="arcade-metrics">
          <span className="arcade-chip">
            Timer <strong>{formatTimer(remainingMs)}</strong>
          </span>
          <span className="arcade-chip">
            Score <strong>{snapshot.score}</strong>
          </span>
          <span className="arcade-chip">
            Rounds <strong>{snapshot.rounds}</strong>
          </span>
          <span className="arcade-chip">
            Streak <strong>{snapshot.streak}</strong>
          </span>
          <span className="arcade-chip">
            Best <strong>{snapshot.bestStreak}</strong>
          </span>
        </div>
      </section>

      <section className="arcade-card dex-rush-board-wrap">
        <p className="dex-rush-kicker">Dex Number Sprint</p>
        <h2>Will the next Pokemon be higher or lower?</h2>
        <div className="dex-rush-board">
          {snapshot.round && currentPokemon && nextPokemon ? (
            <>
              <article className="dex-rush-card" data-role="current">
                <div className="arcade-media dex-rush-media">
                  {currentPokemon.thumb || currentPokemon.images.main ? (
                    <img src={currentPokemon.thumb || currentPokemon.images.main} alt={currentPokemon.name} loading="lazy" decoding="async" />
                  ) : (
                    <span className="dex-rush-fallback">No art</span>
                  )}
                </div>
                <h3>{currentPokemon.name}</h3>
                <p className="dex-rush-dex">{padDex(currentPokemon.id)}</p>
                <p className="dex-rush-types">
                  {(currentPokemon.typeNames || []).map((entry) => capitalize(entry)).join(" / ") ||
                    "Unknown typing"}
                </p>
              </article>

              <article className="dex-rush-card" data-role="next">
                <div className={cn("arcade-media dex-rush-media", !snapshot.revealed && "is-hidden")}>
                  {nextPokemon.thumb || nextPokemon.images.main ? (
                    <img
                      src={nextPokemon.thumb || nextPokemon.images.main}
                      alt={snapshot.revealed ? nextPokemon.name : "Hidden Pokemon"}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="dex-rush-fallback">No art</span>
                  )}
                </div>
                <h3>{snapshot.revealed ? nextPokemon.name : "Hidden"}</h3>
                <p className="dex-rush-dex">{snapshot.revealed ? padDex(nextPokemon.id) : "#????"}</p>
                <p className="dex-rush-types">
                  {snapshot.revealed
                    ? (nextPokemon.typeNames || []).map((entry) => capitalize(entry)).join(" / ") ||
                    "Unknown typing"
                    : "Dex challenge"}
                </p>
              </article>
            </>
          ) : (
            <p className="dex-rush-placeholder">Press Start Rush to begin.</p>
          )}
        </div>

        <div className="arcade-options dex-rush-guess-controls">
          <button type="button" className="arcade-btn" onClick={() => makeGuess("higher")} disabled={!canGuess}>
            Higher
          </button>
          <button type="button" className="arcade-btn-ghost" onClick={() => makeGuess("lower")} disabled={!canGuess}>
            Lower
          </button>
        </div>

        <p className={cn("dex-rush-feedback", busy && "is-busy")} aria-live="polite">{snapshot.feedback}</p>
      </section>

      <section className="arcade-card dex-rush-controls">
        <div className="arcade-options">
          <button type="button" className="arcade-btn" onClick={() => void startRush()} disabled={snapshot.playing || busy}>
            Start Rush
          </button>
          <button type="button" className="arcade-btn-ghost" onClick={() => void continueRush()} disabled={!(snapshot.playing && snapshot.revealed && !busy)}>
            Continue
          </button>
          <button type="button" className="arcade-btn-danger" onClick={() => void startRush()} disabled={busy}>
            Restart
          </button>
        </div>
      </section>

      <section className="arcade-card dex-rush-history-card">
        <h3>Recent Calls</h3>
        <ol className="dex-rush-history">
          {!snapshot.history.length ? (
            <li className="dex-rush-history-empty">No calls yet.</li>
          ) : (
            snapshot.history.map((entry, idx) => (
              <li key={`${entry.name}-${idx}`} className={entry.correct ? "is-correct" : "is-wrong"}>
                {`${entry.correct ? "Hit" : "Miss"}: ${entry.name} ${padDex(entry.dex)} (${entry.expected})`}
              </li>
            ))
          )}
        </ol>
      </section>
    </section>
  );
};
