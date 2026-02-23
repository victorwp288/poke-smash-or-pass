import { TYPE_LIST, type PokemonTypeName } from "@/lib/typeChart";

export const TYPE_CLASH_KEY = "smashdex_game_type_clash";

export const DEFAULT_FEEDBACK = "Pick the Pokemon that would take the bigger hit.";

export type TypeClashHistoryEntry = {
  attackType: PokemonTypeName;
  pickedName: string;
  correctName: string;
  correct: boolean;
};

export type TypeClashRoundSnapshot = {
  attackType: PokemonTypeName;
  optionNames: [string, string];
  multipliers: [number, number];
  correctIndex: 0 | 1;
};

export type TypeClashSnapshot = {
  score: number;
  rounds: number;
  correct: number;
  streak: number;
  bestStreak: number;
  round: TypeClashRoundSnapshot | null;
  revealed: boolean;
  selectedIndex: 0 | 1 | null;
  feedback: string;
  history: TypeClashHistoryEntry[];
};

export const defaultTypeClashSnapshot = (): TypeClashSnapshot => ({
  score: 0,
  rounds: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  round: null,
  revealed: false,
  selectedIndex: null,
  feedback: DEFAULT_FEEDBACK,
  history: []
});

const isTypeName = (value: unknown): value is PokemonTypeName =>
  typeof value === "string" && (TYPE_LIST as string[]).includes(value);

export const parseTypeClashSnapshot = (raw: unknown): TypeClashSnapshot => {
  if (!raw || typeof raw !== "object") return defaultTypeClashSnapshot();
  const readNumber = (key: keyof Omit<TypeClashSnapshot, "round" | "history">) =>
    Math.max(0, Number((raw as any)[key]) || 0);

  const historyRaw = Array.isArray((raw as any).history) ? (raw as any).history : [];
  const history: TypeClashHistoryEntry[] = historyRaw
    .map((entry: any) => {
      if (!entry || typeof entry !== "object") return null;
      const attackType = entry.attackType;
      if (!isTypeName(attackType)) return null;
      return {
        attackType,
        pickedName: String(entry.pickedName || "Unknown"),
        correctName: String(entry.correctName || "Unknown"),
        correct: Boolean(entry.correct)
      } satisfies TypeClashHistoryEntry;
    })
    .filter(Boolean) as TypeClashHistoryEntry[];

  const roundRaw = (raw as any).round;
  let round: TypeClashRoundSnapshot | null = null;
  if (roundRaw && typeof roundRaw === "object" && isTypeName(roundRaw.attackType)) {
    const optionNamesRaw = Array.isArray(roundRaw.optionNames) ? roundRaw.optionNames : [];
    const optionNames =
      optionNamesRaw.length === 2
        ? ([String(optionNamesRaw[0] || "").toLowerCase(), String(optionNamesRaw[1] || "").toLowerCase()] as const)
        : null;

    const multipliersRaw = Array.isArray(roundRaw.multipliers) ? roundRaw.multipliers : [];
    const multipliers =
      multipliersRaw.length === 2
        ? ([Number(multipliersRaw[0]) || 0, Number(multipliersRaw[1]) || 0] as const)
        : null;

    if (optionNames && optionNames[0] && optionNames[1] && multipliers) {
      const correctIndex = Number(roundRaw.correctIndex) === 1 ? 1 : 0;
      round = {
        attackType: roundRaw.attackType,
        optionNames: [optionNames[0], optionNames[1]],
        multipliers: [multipliers[0], multipliers[1]],
        correctIndex
      };
    }
  }

  const selectedRaw = (raw as any).selectedIndex;
  const selectedIndex =
    Number(selectedRaw) === 0 ? 0 : Number(selectedRaw) === 1 ? 1 : null;

  return {
    score: readNumber("score"),
    rounds: readNumber("rounds"),
    correct: readNumber("correct"),
    streak: readNumber("streak"),
    bestStreak: readNumber("bestStreak"),
    round,
    revealed: Boolean((raw as any).revealed),
    selectedIndex,
    feedback:
      typeof (raw as any).feedback === "string" ? (raw as any).feedback : DEFAULT_FEEDBACK,
    history: history.slice(0, 8)
  };
};

