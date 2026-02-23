import type { PokemonTypeName } from "@/lib/typeChart";

export type HistoryEntry = { name: string; thumb: string };

export type SmashHistoryStorage = {
  smash: HistoryEntry[];
  pass: HistoryEntry[];
  smashCount: number;
  passCount: number;
  typeCounts?: Record<string, number>;
  statTotals?: Record<string, number>;
};

export type SmashFiltersStorage = {
  gens: number[];
  types: PokemonTypeName[];
};

export type SmashOptionsStorage = {
  autoReveal: boolean;
  shinyMode: boolean;
  dailyDeck: boolean;
  onlyMega: boolean;
  keepHistory: boolean;
};

export type SwipeDirection = "smash" | "pass";

export type HistoryStackEntry = {
  pokemonName: string;
  direction: SwipeDirection;
};

