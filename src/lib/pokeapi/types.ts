import type { PokemonTypeName } from "@/lib/typeChart";

export type PokemonCategory =
  | "legendary"
  | "mythical"
  | "ultra-beast"
  | "paradox"
  | "standard";

export type PokemonAbility = {
  name: string;
  isHidden: boolean;
  slot: number;
  description: string;
};

export type PokemonSprites = {
  main: string;
  shiny: string;
  gallery: string[];
};

export type EvolutionEntry = {
  name: string;
  label: string;
  id: number | null;
  sprite: string;
  generation: number | null;
  parentName: string | null;
  parentGeneration: number | null;
  isLaterGenEvolution: boolean;
  methodLabels: string[];
};

export type EvolutionStages = EvolutionEntry[][];

export type Pokemon = {
  id: number;
  rawName: string;
  name: string;
  generation: number | null;
  height: number;
  weight: number;
  typeNames: PokemonTypeName[];
  baseStatTotal: number;
  category: PokemonCategory;
  categoryTags: PokemonCategory[];
  speciesColor: string;
  habitat: string;
  nameLength: number;
  abilities: PokemonAbility[];
  cry: string;
  canMegaEvolve: boolean;
  evolution: EvolutionStages;
  types: Array<{ slot?: number; type: { name: PokemonTypeName } }>;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
  bio: string;
  images: PokemonSprites;
  thumb: string;
};

export type PokeApiNamedResource<TName extends string = string> = {
  name: TName;
  url: string;
};
