export type PokemonTypeName =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy";

type Matchup = {
  double: PokemonTypeName[];
  half: PokemonTypeName[];
  zero: PokemonTypeName[];
};

export const typeChart: Record<PokemonTypeName, Matchup> = {
  normal: { double: [], half: ["rock", "steel"], zero: ["ghost"] },
  fire: {
    double: ["grass", "ice", "bug", "steel"],
    half: ["fire", "water", "rock", "dragon"],
    zero: []
  },
  water: {
    double: ["fire", "ground", "rock"],
    half: ["water", "grass", "dragon"],
    zero: []
  },
  electric: {
    double: ["water", "flying"],
    half: ["electric", "grass", "dragon"],
    zero: ["ground"]
  },
  grass: {
    double: ["water", "ground", "rock"],
    half: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
    zero: []
  },
  ice: {
    double: ["grass", "ground", "flying", "dragon"],
    half: ["fire", "water", "ice", "steel"],
    zero: []
  },
  fighting: {
    double: ["normal", "ice", "rock", "dark", "steel"],
    half: ["poison", "flying", "psychic", "bug", "fairy"],
    zero: ["ghost"]
  },
  poison: {
    double: ["grass", "fairy"],
    half: ["poison", "ground", "rock", "ghost"],
    zero: ["steel"]
  },
  ground: {
    double: ["fire", "electric", "poison", "rock", "steel"],
    half: ["grass", "bug"],
    zero: ["flying"]
  },
  flying: {
    double: ["grass", "fighting", "bug"],
    half: ["electric", "rock", "steel"],
    zero: []
  },
  psychic: {
    double: ["fighting", "poison"],
    half: ["psychic", "steel"],
    zero: ["dark"]
  },
  bug: {
    double: ["grass", "psychic", "dark"],
    half: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
    zero: []
  },
  rock: {
    double: ["fire", "ice", "flying", "bug"],
    half: ["fighting", "ground", "steel"],
    zero: []
  },
  ghost: { double: ["psychic", "ghost"], half: ["dark"], zero: ["normal"] },
  dragon: { double: ["dragon"], half: ["steel"], zero: ["fairy"] },
  dark: {
    double: ["psychic", "ghost"],
    half: ["fighting", "dark", "fairy"],
    zero: []
  },
  steel: {
    double: ["ice", "rock", "fairy"],
    half: ["fire", "water", "electric", "steel"],
    zero: []
  },
  fairy: {
    double: ["fighting", "dragon", "dark"],
    half: ["fire", "poison", "steel"],
    zero: []
  }
};

export const TYPE_LIST: PokemonTypeName[] = Object.keys(typeChart) as PokemonTypeName[];

export const typeEffectiveness = (
  attackType: PokemonTypeName,
  defenderTypes: Array<PokemonTypeName | { type?: { name?: string } }> = []
) => {
  if (!attackType || defenderTypes.length === 0) return 1;
  const matchup = typeChart[attackType];
  return defenderTypes.reduce((multiplier, defender) => {
    const defendingType =
      typeof defender === "string"
        ? defender
        : (defender?.type?.name as PokemonTypeName | undefined);
    if (!defendingType) return multiplier;
    if (matchup.zero.includes(defendingType)) return multiplier * 0;
    if (matchup.double.includes(defendingType)) return multiplier * 2;
    if (matchup.half.includes(defendingType)) return multiplier * 0.5;
    return multiplier;
  }, 1);
};
