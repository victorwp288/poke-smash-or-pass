export const POKEAPI = "https://pokeapi.co/api/v2";

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const capitalize = (text = "") =>
  text
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("-");

export const shuffle = (items) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export const pickRandom = (items) => {
  if (!items.length) return undefined;
  return items[Math.floor(Math.random() * items.length)];
};

export const pickMany = (items, count) => shuffle(items).slice(0, count);

export const formatId = (id) => `#${String(id || 0).padStart(4, "0")}`;

export const sumBaseStats = (stats = []) =>
  stats.reduce((sum, stat) => sum + (Number(stat?.base_stat) || 0), 0);

export const getStat = (stats = [], key) =>
  Number(stats.find((entry) => entry?.stat?.name === key)?.base_stat || 0);

export const typeChart = {
  normal: { double: [], half: ["rock", "steel"], zero: ["ghost"] },
  fire: {
    double: ["grass", "ice", "bug", "steel"],
    half: ["fire", "water", "rock", "dragon"],
    zero: [],
  },
  water: {
    double: ["fire", "ground", "rock"],
    half: ["water", "grass", "dragon"],
    zero: [],
  },
  electric: {
    double: ["water", "flying"],
    half: ["electric", "grass", "dragon"],
    zero: ["ground"],
  },
  grass: {
    double: ["water", "ground", "rock"],
    half: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
    zero: [],
  },
  ice: {
    double: ["grass", "ground", "flying", "dragon"],
    half: ["fire", "water", "ice", "steel"],
    zero: [],
  },
  fighting: {
    double: ["normal", "ice", "rock", "dark", "steel"],
    half: ["poison", "flying", "psychic", "bug", "fairy"],
    zero: ["ghost"],
  },
  poison: {
    double: ["grass", "fairy"],
    half: ["poison", "ground", "rock", "ghost"],
    zero: ["steel"],
  },
  ground: {
    double: ["fire", "electric", "poison", "rock", "steel"],
    half: ["grass", "bug"],
    zero: ["flying"],
  },
  flying: {
    double: ["grass", "fighting", "bug"],
    half: ["electric", "rock", "steel"],
    zero: [],
  },
  psychic: {
    double: ["fighting", "poison"],
    half: ["psychic", "steel"],
    zero: ["dark"],
  },
  bug: {
    double: ["grass", "psychic", "dark"],
    half: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
    zero: [],
  },
  rock: {
    double: ["fire", "ice", "flying", "bug"],
    half: ["fighting", "ground", "steel"],
    zero: [],
  },
  ghost: { double: ["psychic", "ghost"], half: ["dark"], zero: ["normal"] },
  dragon: { double: ["dragon"], half: ["steel"], zero: ["fairy"] },
  dark: {
    double: ["psychic", "ghost"],
    half: ["fighting", "dark", "fairy"],
    zero: [],
  },
  steel: {
    double: ["ice", "rock", "fairy"],
    half: ["fire", "water", "electric", "steel"],
    zero: [],
  },
  fairy: {
    double: ["fighting", "dragon", "dark"],
    half: ["fire", "poison", "steel"],
    zero: [],
  },
};

export const TYPE_LIST = Object.keys(typeChart);

export const typeEffectiveness = (attackType, defenderTypes = []) => {
  if (!attackType || !defenderTypes.length) return 1;
  const matchup = typeChart[attackType];
  if (!matchup) return 1;
  return defenderTypes.reduce((multiplier, defender) => {
    const defendingType = typeof defender === "string" ? defender : defender?.type?.name;
    if (!defendingType) return multiplier;
    if (matchup.zero.includes(defendingType)) return multiplier * 0;
    if (matchup.double.includes(defendingType)) return multiplier * 2;
    if (matchup.half.includes(defendingType)) return multiplier * 0.5;
    return multiplier;
  }, 1);
};

export const seededRng = (seed) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 48271) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

export const dateSeed = () => {
  const now = new Date();
  return Number(`${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`);
};

export const emptyNode = (selector, message = "No data") => {
  const node = document.createElement("div");
  node.className = selector;
  node.textContent = message;
  return node;
};
