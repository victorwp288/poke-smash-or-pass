export const DEX_RUSH_KEY = "smashdex_game_dex_rush";

export const DEFAULT_FEEDBACK = "Start a rush, then call higher or lower.";

export type DexRushHistoryEntry = {
  guess: "higher" | "lower";
  expected: "higher" | "lower";
  correct: boolean;
  name: string;
  dex: number;
};

export type DexRushRoundSnapshot = {
  currentName: string;
  nextName: string;
};

export type DexRushSnapshot = {
  score: number;
  rounds: number;
  streak: number;
  bestStreak: number;
  round: DexRushRoundSnapshot | null;
  revealed: boolean;
  guess: "" | "higher" | "lower";
  feedback: string;
  history: DexRushHistoryEntry[];
  playing: boolean;
  timerEndsAt: number | null;
};

export const defaultDexRushSnapshot = (): DexRushSnapshot => ({
  score: 0,
  rounds: 0,
  streak: 0,
  bestStreak: 0,
  round: null,
  revealed: false,
  guess: "",
  feedback: DEFAULT_FEEDBACK,
  history: [],
  playing: false,
  timerEndsAt: null
});

export const parseDexRushSnapshot = (raw: unknown): DexRushSnapshot => {
  if (!raw || typeof raw !== "object") return defaultDexRushSnapshot();
  const base = defaultDexRushSnapshot();
  const readNumber = (key: keyof Omit<DexRushSnapshot, "round" | "history" | "timerEndsAt">) =>
    Math.max(0, Number((raw as any)[key]) || 0);

  const roundRaw = (raw as any).round;
  let round: DexRushRoundSnapshot | null = null;
  if (roundRaw && typeof roundRaw === "object") {
    const currentName = String(roundRaw.currentName || "").toLowerCase();
    const nextName = String(roundRaw.nextName || "").toLowerCase();
    if (currentName && nextName && currentName !== nextName) {
      round = { currentName, nextName };
    }
  }

  const historyRaw = Array.isArray((raw as any).history) ? (raw as any).history : [];
  const history: DexRushHistoryEntry[] = historyRaw
    .map((entry: any) => {
      if (!entry || typeof entry !== "object") return null;
      const guess = entry.guess === "higher" ? "higher" : entry.guess === "lower" ? "lower" : null;
      const expected = entry.expected === "higher" ? "higher" : entry.expected === "lower" ? "lower" : null;
      if (!guess || !expected) return null;
      return {
        guess,
        expected,
        correct: Boolean(entry.correct),
        name: String(entry.name || "Unknown"),
        dex: Math.max(0, Number(entry.dex) || 0)
      } satisfies DexRushHistoryEntry;
    })
    .filter(Boolean)
    .slice(0, 10) as DexRushHistoryEntry[];

  const endsAtRaw = Number((raw as any).timerEndsAt);
  const timerEndsAt = Number.isFinite(endsAtRaw) && endsAtRaw > 0 ? endsAtRaw : null;

  const guessRaw = (raw as any).guess;
  const guess: DexRushSnapshot["guess"] =
    guessRaw === "higher" ? "higher" : guessRaw === "lower" ? "lower" : "";

  const now = Date.now();
  const playing =
    Boolean((raw as any).playing) &&
    Boolean(round) &&
    Boolean(timerEndsAt) &&
    (timerEndsAt as number) > now;

  return {
    ...base,
    score: readNumber("score"),
    rounds: readNumber("rounds"),
    streak: readNumber("streak"),
    bestStreak: readNumber("bestStreak"),
    round,
    revealed: Boolean((raw as any).revealed),
    guess,
    feedback: typeof (raw as any).feedback === "string" ? (raw as any).feedback : base.feedback,
    history,
    playing,
    timerEndsAt
  };
};
