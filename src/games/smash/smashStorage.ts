import { TYPE_LIST, type PokemonTypeName } from "@/lib/typeChart";
import type {
  HistoryEntry,
  SmashFiltersStorage,
  SmashHistoryStorage,
  SmashOptionsStorage
} from "@/games/smash/smashTypes";

export const STORAGE_KEY = "smashdex_history";
export const FILTER_KEY = "smashdex_filters";
export const OPTIONS_KEY = "smashdex_options";
export const FAVORITES_KEY = "smashdex_favorites";
export const MODE_KEY = "smashdex_mode";

export const GEN_COUNT = 9;

export const defaultFilters = (): SmashFiltersStorage => ({
  gens: Array.from({ length: GEN_COUNT }, (_, i) => i + 1),
  types: [...TYPE_LIST]
});

export const defaultOptions = (): SmashOptionsStorage => ({
  autoReveal: true,
  shinyMode: false,
  dailyDeck: false,
  onlyMega: false,
  keepHistory: true
});

export const defaultHistory = (): SmashHistoryStorage => ({
  smash: [],
  pass: [],
  smashCount: 0,
  passCount: 0,
  typeCounts: {},
  statTotals: {}
});

const normalizeEntry = (entry: unknown): HistoryEntry | null => {
  if (typeof entry === "string") {
    const name = entry.trim();
    if (!name) return null;
    return { name, thumb: "" };
  }
  if (!entry || typeof entry !== "object") return null;
  const name = String((entry as any).name || "").trim();
  if (!name) return null;
  return { name, thumb: String((entry as any).thumb || "") };
};

export const parseFavorites = (raw: unknown): HistoryEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeEntry).filter(Boolean) as HistoryEntry[];
};

export const parseHistory = (raw: unknown): SmashHistoryStorage => {
  if (!raw || typeof raw !== "object") return defaultHistory();
  const smash = Array.isArray((raw as any).smash)
    ? ((raw as any).smash as unknown[]).map(normalizeEntry).filter(Boolean)
    : [];
  const pass = Array.isArray((raw as any).pass)
    ? ((raw as any).pass as unknown[]).map(normalizeEntry).filter(Boolean)
    : [];

  const smashCount = Number((raw as any).smashCount);
  const passCount = Number((raw as any).passCount);

  const typeCounts =
    (raw as any).typeCounts && typeof (raw as any).typeCounts === "object"
      ? (raw as any).typeCounts
      : {};
  const statTotals =
    (raw as any).statTotals && typeof (raw as any).statTotals === "object"
      ? (raw as any).statTotals
      : {};

  return {
    smash: smash as HistoryEntry[],
    pass: pass as HistoryEntry[],
    smashCount: Number.isFinite(smashCount) ? smashCount : smash.length,
    passCount: Number.isFinite(passCount) ? passCount : pass.length,
    typeCounts,
    statTotals
  };
};

export const parseFilters = (raw: unknown): SmashFiltersStorage => {
  if (!raw || typeof raw !== "object") return defaultFilters();

  const gensRaw = (raw as any).gens;
  const typesRaw = (raw as any).types;

  const gens = Array.isArray(gensRaw)
    ? gensRaw
        .map((gen: any) => Number(gen))
        .filter(
          (gen: number) => Number.isInteger(gen) && gen >= 1 && gen <= GEN_COUNT
        )
    : [];

  const types = Array.isArray(typesRaw)
    ? typesRaw
        .map((type: any) => String(type))
        .filter((type: string): type is PokemonTypeName =>
          (TYPE_LIST as string[]).includes(type)
        )
    : [];

  return {
    gens,
    types
  };
};

export const parseOptions = (raw: unknown): SmashOptionsStorage => {
  if (!raw || typeof raw !== "object") return defaultOptions();
  const fallback = defaultOptions();
  const readBool = (key: keyof SmashOptionsStorage) =>
    typeof (raw as any)[key] === "boolean" ? Boolean((raw as any)[key]) : fallback[key];

  return {
    autoReveal: readBool("autoReveal"),
    shinyMode: readBool("shinyMode"),
    dailyDeck: readBool("dailyDeck"),
    onlyMega: readBool("onlyMega"),
    keepHistory: readBool("keepHistory")
  };
};

