export const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2";

export const SPRITE_CDN =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export const ITEM_SPRITE_CDN =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items";

export const TYPE_ICON_FILES: Record<string, string> = {
  normal: "normal.png",
  fire: "fire.png",
  water: "water.png",
  electric: "electric.png",
  grass: "grass.png",
  ice: "ice.png",
  fighting: "fighting.png",
  poison: "poison.png",
  ground: "ground.png",
  flying: "flying.png",
  psychic: "psychic.png",
  bug: "bug.png",
  rock: "rock.png",
  ghost: "ghost.png",
  dragon: "dragon.png",
  dark: "dark.png",
  steel: "steel.png",
  fairy: "fairy.png"
};

export const TYPE_COLORS: Record<string, string> = {
  normal: "#9099a1",
  fire: "#ff9c54",
  water: "#4d90d4",
  electric: "#f3d23b",
  grass: "#63bb5b",
  ice: "#74cec0",
  fighting: "#ce406a",
  poison: "#ae6eca",
  ground: "#d97845",
  flying: "#8fa8dd",
  psychic: "#f97175",
  bug: "#90c12c",
  rock: "#c7b78b",
  ghost: "#6f4170",
  dragon: "#076dc4",
  dark: "#5a5266",
  steel: "#5a8ea1",
  fairy: "#ec90e6"
};

export const CATEGORY_LABELS: Record<string, string> = {
  legendary: "Legendary",
  mythical: "Mythical",
  "ultra-beast": "Ultra Beast",
  paradox: "Paradox",
  standard: "Standard"
};

export const ULTRA_BEAST_SPECIES = new Set([
  "nihilego",
  "buzzwole",
  "pheromosa",
  "xurkitree",
  "celesteela",
  "kartana",
  "guzzlord",
  "poipole",
  "naganadel",
  "stakataka",
  "blacephalon"
]);

export const PARADOX_SPECIES = new Set([
  "great-tusk",
  "scream-tail",
  "brute-bonnet",
  "flutter-mane",
  "slither-wing",
  "sandy-shocks",
  "roaring-moon",
  "iron-treads",
  "iron-bundle",
  "iron-hands",
  "iron-jugulis",
  "iron-moth",
  "iron-thorns",
  "iron-valiant",
  "walking-wake",
  "iron-leaves",
  "gouging-fire",
  "raging-bolt",
  "iron-boulder",
  "iron-crown",
  "koraidon",
  "miraidon"
]);

export const MEGA_EVOLUTION_SPECIES = new Set([
  "venusaur",
  "charizard",
  "blastoise",
  "beedrill",
  "pidgeot",
  "alakazam",
  "slowbro",
  "gengar",
  "kangaskhan",
  "pinsir",
  "gyarados",
  "aerodactyl",
  "mewtwo",
  "ampharos",
  "steelix",
  "scizor",
  "heracross",
  "houndoom",
  "tyranitar",
  "sceptile",
  "blaziken",
  "swampert",
  "gardevoir",
  "sableye",
  "mawile",
  "aggron",
  "medicham",
  "manectric",
  "sharpedo",
  "camerupt",
  "altaria",
  "banette",
  "absol",
  "glalie",
  "salamence",
  "metagross",
  "latias",
  "latios",
  "lopunny",
  "garchomp",
  "lucario",
  "abomasnow",
  "gallade",
  "audino",
  "diancie",
  "rayquaza"
]);
