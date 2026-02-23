export const GUESS_STATS_KEY = "smashdex_guess_stats";

export type GuessStatsStorage = {
  played: number;
  wins: number;
  streak: number;
  bestStreak: number;
};

export const defaultGuessStats = (): GuessStatsStorage => ({
  played: 0,
  wins: 0,
  streak: 0,
  bestStreak: 0
});

export const parseGuessStats = (raw: unknown): GuessStatsStorage => {
  if (!raw || typeof raw !== "object") return defaultGuessStats();
  const readNumber = (key: keyof GuessStatsStorage) =>
    Math.max(0, Number((raw as any)[key]) || 0);

  return {
    played: readNumber("played"),
    wins: readNumber("wins"),
    streak: readNumber("streak"),
    bestStreak: readNumber("bestStreak")
  };
};

