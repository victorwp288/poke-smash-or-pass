const POKEAPI = "https://pokeapi.co/api/v2";
const GEN_COUNT = 9;
const STORAGE_KEY = "smashdex_history";
const FILTER_KEY = "smashdex_filters";
const OPTIONS_KEY = "smashdex_options";
const FAV_KEY = "smashdex_favorites";
const MODE_KEY = "smashdex_mode";
const GUESS_STATS_KEY = "smashdex_guess_stats";
const SUMMARY_INTERVAL = 20;
const DAILY_SIZE = 20;
const PRELOAD_COUNT = 2;
const GUESS_MAX_ATTEMPTS = 6;
const GUESS_SUGGESTION_LIMIT = 8;
const MOBILE_VIEW_QUERY = "(max-width: 980px)";
const SHUFFLE_SWIPE_MIN_DISTANCE = 120;
const SHUFFLE_SWIPE_MAX_HORIZONTAL_DRIFT = 72;
const SHUFFLE_SWIPE_MIN_VELOCITY = 0.45;
const SPRITE_CDN =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const ITEM_SPRITE_CDN =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items";
const HEIGHT_ICON_URL = "icons/height.svg";
const WEIGHT_ICON_URL = "icons/weight.svg";
const MEGA_ICON_URL = "icons/megaevolution.webp";
const QUERY_PARAMS = new URLSearchParams(location.search);
const EMBED_MODE_PARAM = QUERY_PARAMS.get("mode");
const EMBED_MODE =
  EMBED_MODE_PARAM === "smash" || EMBED_MODE_PARAM === "guess"
    ? EMBED_MODE_PARAM
    : "";
const EMBED_LOCK = QUERY_PARAMS.get("embed") === "1";

const els = {
  modeSmashBtn: document.getElementById("modeSmashBtn"),
  modeGuessBtn: document.getElementById("modeGuessBtn"),
  smashModePane: document.getElementById("smashModePane"),
  guessModePane: document.getElementById("guessModePane"),
  scoreLabelA: document.getElementById("scoreLabelA"),
  scoreLabelB: document.getElementById("scoreLabelB"),
  cardShell: document.getElementById("cardShell"),
  card: document.getElementById("card"),
  mainImage: document.getElementById("mainImage"),
  thumbs: document.getElementById("thumbs"),
  name: document.getElementById("pokeName"),
  id: document.getElementById("pokeId"),
  types: document.getElementById("typeBadges"),
  bio: document.getElementById("bio"),
  evolutionLine: document.getElementById("evolutionLine"),
  stats: document.getElementById("stats"),
  passBtn: document.getElementById("passBtn"),
  smashBtn: document.getElementById("smashBtn"),
  undoBtn: document.getElementById("undoBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  peekBtn: document.getElementById("peekBtn"),
  cryBtn: document.getElementById("cryBtn"),
  favoriteBtn: document.getElementById("favoriteBtn"),
  genGrid: document.getElementById("genGrid"),
  typeGrid: document.getElementById("typeGrid"),
  selectAll: document.getElementById("selectAll"),
  clearAll: document.getElementById("clearAll"),
  typeAll: document.getElementById("typeAll"),
  typeClear: document.getElementById("typeClear"),
  autoReveal: document.getElementById("autoReveal"),
  shinyMode: document.getElementById("shinyMode"),
  dailyDeck: document.getElementById("dailyDeck"),
  onlyMega: document.getElementById("onlyMega"),
  keepHistory: document.getElementById("keepHistory"),
  smashList: document.getElementById("smashList"),
  passList: document.getElementById("passList"),
  clearHistory: document.getElementById("clearHistory"),
  badgeList: document.getElementById("badgeList"),
  favoriteList: document.getElementById("favoriteList"),
  mobileFavoriteList: document.getElementById("mobileFavoriteList"),
  mobileFavoritesCount: document.getElementById("mobileFavoritesCount"),
  exportJson: document.getElementById("exportJson"),
  exportCsv: document.getElementById("exportCsv"),
  shareCard: document.getElementById("shareCard"),
  helpBtn: document.getElementById("helpBtn"),
  mobileHubToggle: document.getElementById("mobileHubToggle"),
  mobileHub: document.getElementById("mobileHub"),
  mobileQueueStatus: document.getElementById("mobileQueueStatus"),
  mobileScoreStatus: document.getElementById("mobileScoreStatus"),
  mobilePassBtn: document.getElementById("mobilePassBtn"),
  mobileSmashBtn: document.getElementById("mobileSmashBtn"),
  mobileUndoBtn: document.getElementById("mobileUndoBtn"),
  mobileShuffleBtn: document.getElementById("mobileShuffleBtn"),
  mobileHubHelp: document.getElementById("mobileHubHelp"),
  mobileHubFilters: document.getElementById("mobileHubFilters"),
  mobileHubClose: document.getElementById("mobileHubClose"),
  mobileHubSmashToggle: document.getElementById("mobileHubSmashToggle"),
  mobileHubPassToggle: document.getElementById("mobileHubPassToggle"),
  mobileHubSmashPanel: document.getElementById("mobileHubSmashPanel"),
  mobileHubPassPanel: document.getElementById("mobileHubPassPanel"),
  mobileHubSmashList: document.getElementById("mobileHubSmashList"),
  mobileHubPassList: document.getElementById("mobileHubPassList"),
  mobileHubSmashCount: document.getElementById("mobileHubSmashCount"),
  mobileHubPassCount: document.getElementById("mobileHubPassCount"),
  summaryModal: document.getElementById("summaryModal"),
  summaryContent: document.getElementById("summaryContent"),
  summaryClose: document.getElementById("summaryClose"),
  helpModal: document.getElementById("helpModal"),
  helpClose: document.getElementById("helpClose"),
  queueStatus: document.getElementById("queueStatus"),
  smashCount: document.getElementById("smashCount"),
  passCount: document.getElementById("passCount"),
  genLabel: document.getElementById("pokeGen"),
  genFilterBlock: document.getElementById("genFilterBlock"),
  typeFilterBlock: document.getElementById("typeFilterBlock"),
  deckOptionsBlock: document.getElementById("deckOptionsBlock"),
  panel: document.getElementById("filterPanel"),
  panelOverlay: document.getElementById("panelOverlay"),
  panelClose: document.getElementById("panelClose"),
  mobileDaily: document.getElementById("mobileDaily"),
  mobileShiny: document.getElementById("mobileShiny"),
  mobileFilters: document.getElementById("mobileFilters"),
  filterCounts: document.getElementById("filterCounts"),
  guessTargetCard: document.getElementById("guessTargetCard"),
  guessTargetImage: document.getElementById("guessTargetImage"),
  guessTargetName: document.getElementById("guessTargetName"),
  guessAttempts: document.getElementById("guessAttempts"),
  guessTargetMeta: document.getElementById("guessTargetMeta"),
  guessClues: document.getElementById("guessClues"),
  guessGenGrid: document.getElementById("guessGenGrid"),
  guessForm: document.getElementById("guessForm"),
  guessInput: document.getElementById("guessInput"),
  guessSubmitBtn: document.getElementById("guessSubmitBtn"),
  guessNameList: document.getElementById("guessNameList"),
  guessSuggestions: document.getElementById("guessSuggestions"),
  guessSuggestionsList: document.getElementById("guessSuggestionsList"),
  guessLive: document.getElementById("guessLive"),
  guessNextBtn: document.getElementById("guessNextBtn"),
  guessHistory: document.getElementById("guessHistory"),
};

const state = {
  activeMode: "smash",
  selectedGens: new Set(Array.from({ length: GEN_COUNT }, (_, i) => i + 1)),
  selectedTypes: new Set(),
  queue: [],
  current: null,
  currentImage: null,
  currentGallery: [],
  cache: new Map(),
  typeIndex: new Map(),
  evolutionChainCache: new Map(),
  abilityEffectCache: new Map(),
  genRosterCache: new Map(),
  smashing: [],
  passing: [],
  history: [],
  favorites: [],
  passCount: 0,
  smashCount: 0,
  swipeCount: 0,
  smashStreak: 0,
  passStreak: 0,
  smashTypeCounts: new Map(),
  smashStatTotals: {},
  isDragging: false,
  dragStart: 0,
  dragStartY: 0,
  dragStartTime: 0,
  dragPointerId: null,
  dragX: 0,
  dragCandidate: false,
  suppressImageClick: false,
  imageSwipeStartX: 0,
  imageSwipeStartY: 0,
  imageSwipePointerId: null,
  imageSwipeActive: false,
  cryAudio: null,
  isShuffling: false,
  mobileHubOpen: false,
  lastGuessTarget: "",
  guessRoundToken: 0,
  guessRoster: [],
  guessSearchEntries: [],
  guessNameLookup: new Map(),
  guessSuggestionsOpen: false,
  guessSuggestionNames: [],
  guessSuggestionIndex: -1,
  guess: {
    targetName: "",
    targetPokemon: null,
    clues: [],
    guesses: [],
    attempts: 0,
    status: "idle",
    message: "",
  },
  guessStats: {
    played: 0,
    wins: 0,
    streak: 0,
    bestStreak: 0,
  },
};

const typeColors = {
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
  fairy: "#ec90e6",
};

const typeIconFiles = {
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
  fairy: "fairy.png",
};

const getTypeIconUrl = (type) => {
  const file = typeIconFiles[type];
  if (!file) return "";
  return `icons/types/${file}`;
};

const TYPE_LIST = Object.keys(typeColors);
const CATEGORY_LABELS = {
  legendary: "Legendary",
  mythical: "Mythical",
  "ultra-beast": "Ultra Beast",
  paradox: "Paradox",
  standard: "Standard",
};
const ULTRA_BEAST_SPECIES = new Set([
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
  "blacephalon",
]);
const PARADOX_SPECIES = new Set([
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
  "miraidon",
]);
const MEGA_EVOLUTION_SPECIES = new Set([
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
  "rayquaza",
]);
const isMobileView = () => window.matchMedia(MOBILE_VIEW_QUERY).matches;

const capitalize = (value) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeInlineText = (value) =>
  String(value ?? "")
    .replace(/[\f\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeGuessToken = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const humanizeTypeList = (types) => {
  if (!Array.isArray(types) || !types.length) return "Unknown";
  return types.map((type) => capitalize(type)).join(" / ");
};

const formatMeters = (decimeters) =>
  Number.isFinite(decimeters) ? (decimeters / 10).toFixed(1) : "?";

const formatKilograms = (hectograms) =>
  Number.isFinite(hectograms) ? (hectograms / 10).toFixed(1) : "?";

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
};

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const seedFromDate = () => {
  const today = new Date();
  const key = today.toISOString().slice(0, 10);
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededShuffle = (list, seed) => {
  const copy = [...list];
  let value = seed;
  const random = () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const saveHistory = () => {
  try {
    const payload = {
      smash: state.smashing,
      pass: state.passing,
      smashCount: state.smashCount,
      passCount: state.passCount,
      typeCounts: Object.fromEntries(state.smashTypeCounts.entries()),
      statTotals: state.smashStatTotals,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
};

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    const normalizeList = (list) =>
      Array.isArray(list)
        ? list.map((entry) =>
            typeof entry === "string"
              ? { name: entry, thumb: "" }
              : { name: entry.name || "Unknown", thumb: entry.thumb || "" },
          )
        : [];
    state.smashing = normalizeList(data.smash);
    state.passing = normalizeList(data.pass);
    state.smashCount = Number(data.smashCount) || state.smashing.length;
    state.passCount = Number(data.passCount) || state.passing.length;
    if (data.typeCounts && typeof data.typeCounts === "object") {
      state.smashTypeCounts = new Map(
        Object.entries(data.typeCounts).map(([key, value]) => [
          key,
          Number(value) || 0,
        ]),
      );
    }
    if (data.statTotals && typeof data.statTotals === "object") {
      state.smashStatTotals = data.statTotals;
    }
  } catch {
    // Ignore storage errors
  }
};

const saveFilters = () => {
  try {
    const payload = {
      gens: Array.from(state.selectedGens.values()),
      types: Array.from(state.selectedTypes.values()),
    };
    localStorage.setItem(FILTER_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
};

const loadFilters = () => {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (Array.isArray(data.gens)) {
      state.selectedGens = new Set(
        data.gens.filter(
          (gen) => Number.isInteger(gen) && gen >= 1 && gen <= GEN_COUNT,
        ),
      );
    }
    if (Array.isArray(data.types)) {
      state.selectedTypes = new Set(
        data.types.filter(
          (type) => typeof type === "string" && TYPE_LIST.includes(type),
        ),
      );
    }
    return true;
  } catch {
    // Ignore storage errors
    return false;
  }
};

const saveOptions = () => {
  try {
    const payload = {
      autoReveal: els.autoReveal.checked,
      shinyMode: els.shinyMode.checked,
      dailyDeck: els.dailyDeck.checked,
      onlyMega: els.onlyMega.checked,
      keepHistory: els.keepHistory.checked,
    };
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors
  }
};

const loadOptions = () => {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.autoReveal === "boolean") {
      els.autoReveal.checked = data.autoReveal;
    }
    if (typeof data.shinyMode === "boolean") {
      els.shinyMode.checked = data.shinyMode;
    }
    if (typeof data.dailyDeck === "boolean") {
      els.dailyDeck.checked = data.dailyDeck;
    }
    if (typeof data.onlyMega === "boolean") {
      els.onlyMega.checked = data.onlyMega;
    }
    if (typeof data.keepHistory === "boolean") {
      els.keepHistory.checked = data.keepHistory;
    }
  } catch {
    // Ignore storage errors
  }
};

const saveFavorites = () => {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(state.favorites));
  } catch {
    // Ignore storage errors
  }
};

const loadFavorites = () => {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      state.favorites = data
        .map((entry) =>
          typeof entry === "string" ? { name: entry, thumb: "" } : entry,
        )
        .filter((entry) => entry && entry.name);
    }
  } catch {
    // Ignore storage errors
  }
};

const saveMode = () => {
  try {
    localStorage.setItem(MODE_KEY, state.activeMode);
  } catch {
    // Ignore storage errors
  }
};

const loadMode = () => {
  if (EMBED_MODE) {
    state.activeMode = EMBED_MODE;
    return;
  }
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === "guess" || raw === "smash") {
      state.activeMode = raw;
    }
  } catch {
    // Ignore storage errors
  }
};

const saveGuessStats = () => {
  try {
    localStorage.setItem(GUESS_STATS_KEY, JSON.stringify(state.guessStats));
  } catch {
    // Ignore storage errors
  }
};

const loadGuessStats = () => {
  try {
    const raw = localStorage.getItem(GUESS_STATS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.guessStats.played = Math.max(0, Number(data.played) || 0);
    state.guessStats.wins = Math.max(0, Number(data.wins) || 0);
    state.guessStats.streak = Math.max(0, Number(data.streak) || 0);
    state.guessStats.bestStreak = Math.max(0, Number(data.bestStreak) || 0);
  } catch {
    // Ignore storage errors
  }
};

const buildGenFilters = () => {
  const containers = [els.genGrid, els.guessGenGrid].filter(Boolean);
  containers.forEach((container) => {
    container.innerHTML = "";
  });
  for (let i = 1; i <= GEN_COUNT; i += 1) {
    containers.forEach((container) => {
      const label = document.createElement("label");
      label.className = "gen-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = String(i);
      checkbox.checked = state.selectedGens.has(i);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          state.selectedGens.add(i);
        } else {
          state.selectedGens.delete(i);
        }
        buildGenFilters();
        saveFilters();
        updateMobileFilterBar();
        if (state.activeMode === "guess") {
          startGuessRound();
        } else {
          rebuildQueue();
        }
      });
      label.appendChild(checkbox);
      label.append(`Gen ${i}`);
      container.appendChild(label);
    });
  }
  updateMobileFilterBar();
};

const buildTypeFilters = () => {
  els.typeGrid.innerHTML = "";
  TYPE_LIST.forEach((type) => {
    const label = document.createElement("label");
    label.className = "type-option";
    label.style.background = `color-mix(in srgb, ${typeColors[type]} 35%, white)`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = type;
    checkbox.checked = state.selectedTypes.has(type);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        state.selectedTypes.add(type);
      } else {
        state.selectedTypes.delete(type);
      }
      saveFilters();
      updateMobileFilterBar();
      if (state.activeMode === "smash") {
        rebuildQueue();
      }
    });
    label.appendChild(checkbox);
    const iconWrap = document.createElement("span");
    iconWrap.className = "type-option-icon";
    const icon = document.createElement("img");
    icon.className = "type-option-icon-img";
    icon.src = getTypeIconUrl(type);
    icon.alt = `${capitalize(type)} type icon`;
    icon.loading = "lazy";
    icon.decoding = "async";
    icon.addEventListener("error", () => {
      iconWrap.classList.add("is-missing");
      icon.remove();
    });
    iconWrap.appendChild(icon);
    label.appendChild(iconWrap);

    const text = document.createElement("span");
    text.className = "type-option-label";
    text.textContent = capitalize(type);
    label.appendChild(text);
    els.typeGrid.appendChild(label);
  });
  updateMobileFilterBar();
};

const updateCounts = () => {
  if (state.activeMode === "guess") {
    if (els.scoreLabelA) els.scoreLabelA.textContent = "Wins";
    if (els.scoreLabelB) els.scoreLabelB.textContent = "Streak";
    els.smashCount.textContent = String(state.guessStats.wins);
    els.passCount.textContent = String(state.guessStats.streak);

    let statusLabel = "GuessDex: Ready";
    if (state.guess.status === "empty") {
      statusLabel = "GuessDex: Select at least one generation.";
    } else if (state.guess.status === "loading") {
      statusLabel = "GuessDex: loading round...";
    } else if (state.guess.status === "playing") {
      statusLabel = `GuessDex: ${state.guess.attempts}/${GUESS_MAX_ATTEMPTS} guesses`;
    } else if (state.guess.status === "won") {
      statusLabel = `GuessDex: solved in ${state.guess.attempts}/${GUESS_MAX_ATTEMPTS}`;
    } else if (state.guess.status === "lost") {
      statusLabel = "GuessDex: out of guesses";
    }

    if (els.queueStatus) {
      els.queueStatus.textContent = statusLabel;
    }
    if (els.mobileQueueStatus) {
      els.mobileQueueStatus.textContent = statusLabel;
    }
    if (els.mobileScoreStatus) {
      els.mobileScoreStatus.textContent = `Wins ${state.guessStats.wins} - Streak ${state.guessStats.streak}`;
    }
    return;
  }

  if (els.scoreLabelA) els.scoreLabelA.textContent = "Smash";
  if (els.scoreLabelB) els.scoreLabelB.textContent = "Pass";
  els.smashCount.textContent = String(state.smashCount);
  els.passCount.textContent = String(state.passCount);
  const label = els.dailyDeck.checked ? "Daily deck" : "Deck";
  const queueText = `${label}: ${state.queue.length} left`;
  if (els.queueStatus) {
    els.queueStatus.textContent = queueText;
  }
  if (els.mobileQueueStatus) {
    els.mobileQueueStatus.textContent = queueText;
  }
  if (els.mobileScoreStatus) {
    els.mobileScoreStatus.textContent = `Smash ${state.smashCount} - Pass ${state.passCount}`;
  }
};

const renderHistory = (items, containers) => {
  const targets = (
    Array.isArray(containers) ? containers : [containers]
  ).filter(Boolean);

  const isSmashLane = targets.includes(els.mobileHubSmashList);
  const isPassLane = targets.includes(els.mobileHubPassList);
  const visibleCount = els.keepHistory.checked ? items.length : 0;
  if (isSmashLane && els.mobileHubSmashCount) {
    els.mobileHubSmashCount.textContent = String(visibleCount);
  }
  if (isPassLane && els.mobileHubPassCount) {
    els.mobileHubPassCount.textContent = String(visibleCount);
  }

  targets.forEach((container) => {
    container.innerHTML = "";
  });
  if (!els.keepHistory.checked) {
    targets.forEach((container) => {
      const isMobileLane =
        container === els.mobileHubSmashList ||
        container === els.mobileHubPassList;
      if (!isMobileLane) return;
      const empty = document.createElement("span");
      empty.className = "mobile-hub-history-empty";
      empty.textContent = "History off";
      container.appendChild(empty);
    });
    return;
  }

  const createChip = (entry) => {
    const chip = document.createElement("span");
    chip.className = "collect-item";
    if (entry.thumb) {
      const img = document.createElement("img");
      img.src = entry.thumb;
      img.alt = entry.name;
      chip.appendChild(img);
    }
    const label = document.createElement("span");
    label.textContent = entry.name;
    chip.appendChild(label);
    return chip;
  };

  targets.forEach((container) => {
    const isMobileLane =
      container === els.mobileHubSmashList ||
      container === els.mobileHubPassList;
    const list = isMobileLane ? items : items.slice(-12);
    if (isMobileLane && !list.length) {
      const empty = document.createElement("span");
      empty.className = "mobile-hub-history-empty";
      empty.textContent = "No picks yet";
      container.appendChild(empty);
      return;
    }
    list.forEach((entry) => {
      const chip = createChip(entry);
      container.appendChild(chip);
    });
  });
};

const chooseFlavorText = (entries) => {
  const english = entries.filter((entry) => entry.language.name === "en");
  const unique = Array.from(
    new Set(
      english.map((entry) => entry.flavor_text.replace(/\s+/g, " ").trim()),
    ),
  );
  return unique[0] || "No flavor text yet.";
};

const formatStats = (stats) => {
  const total = stats.reduce((sum, stat) => sum + stat.base_stat, 0);
  const rows = stats.map(
    (stat) =>
      `<div class="stat"><span>${capitalize(stat.stat.name)}</span><span>${stat.base_stat}</span></div>`,
  );
  rows.push(
    `<div class="stat stat-total"><span>Total</span><span>${total}</span></div>`,
  );
  return rows.join("");
};

const formatAbilities = (abilities) => {
  if (!Array.isArray(abilities) || !abilities.length) {
    return "";
  }
  const sorted = [...abilities].sort((a, b) => {
    const hiddenOrder = Number(a.isHidden) - Number(b.isHidden);
    if (hiddenOrder !== 0) return hiddenOrder;
    return (a.slot || 99) - (b.slot || 99);
  });

  return `<div class="abilities-block">
    <span class="abilities-title">Abilities</span>
    <div class="abilities-list" role="tablist" aria-label="Pokemon abilities">
      ${sorted
        .map((ability, index) => {
          const isActive = index === 0;
          const tabId = `ability-tab-${index}`;
          const panelId = `ability-panel-${index}`;
          return `<button type="button" class="ability-chip${
            isActive ? " is-active" : ""
          }" data-ability-tab="${index}" role="tab" id="${tabId}" aria-selected="${isActive}" aria-controls="${panelId}">
            <span class="ability-name">${escapeHtml(capitalize(
              ability.name,
            ))}</span>
            ${
              ability.isHidden
                ? '<span class="ability-hidden">Hidden</span>'
                : ""
            }
          </button>`;
        })
        .join("")}
    </div>
    <div class="ability-panels">
      ${sorted
        .map((ability, index) => {
          const isActive = index === 0;
          const tabId = `ability-tab-${index}`;
          const panelId = `ability-panel-${index}`;
          const description = normalizeInlineText(ability.description);
          return `<div class="ability-panel${
            isActive ? " is-active" : ""
          }" id="${panelId}" data-ability-panel="${index}" role="tabpanel" aria-labelledby="${tabId}"${
            isActive ? "" : " hidden"
          }>${escapeHtml(description || "No description available yet.")}</div>`;
        })
        .join("")}
    </div>
  </div>`;
};

const formatVitals = (pokemon) => {
  const generation = getGenerationFromId(pokemon.id);
  const heightMeters = Number.isFinite(pokemon.height)
    ? (pokemon.height / 10).toFixed(1)
    : "?";
  const weightKg = Number.isFinite(pokemon.weight)
    ? (pokemon.weight / 10).toFixed(1)
    : "?";
  const vitals = [
    { label: "Gen", value: generation ? `${generation}` : "Unknown" },
    {
      label: "",
      value: `${heightMeters} m`,
      icon: HEIGHT_ICON_URL,
      iconAlt: "Pokemon Scarlet and Violet height icon",
    },
    {
      label: "",
      value: `${weightKg} kg`,
      icon: WEIGHT_ICON_URL,
      iconAlt: "Pokemon Scarlet and Violet weight icon",
    },
  ];

  return `<div class="stat-vitals">${vitals
    .map(
      (item) =>
        `<span class="vital-item">${
          item.icon
            ? `<img class="vital-icon" src="${item.icon}" alt="${item.iconAlt}" loading="lazy" decoding="async" />`
            : ""
        }<span class="vital-key">${item.label}</span><span class="vital-value">${item.value}</span></span>`,
    )
    .join("")}</div>`;
};

const getGenerationFromId = (id) => {
  if (id >= 1 && id <= 151) return 1;
  if (id >= 152 && id <= 251) return 2;
  if (id >= 252 && id <= 386) return 3;
  if (id >= 387 && id <= 493) return 4;
  if (id >= 494 && id <= 649) return 5;
  if (id >= 650 && id <= 721) return 6;
  if (id >= 722 && id <= 809) return 7;
  if (id >= 810 && id <= 905) return 8;
  if (id >= 906 && id <= 1025) return 9;
  return null;
};

const getSpriteScale = (pokemon) => {
  const height = Math.max(1, Number(pokemon?.height) || 10);
  const scaled = 1.12 - Math.log10(height) * 0.28;
  return Math.min(1.02, Math.max(0.62, scaled));
};

const getSpeciesIdFromUrl = (url) => {
  if (typeof url !== "string") return null;
  const match = url.match(/\/pokemon-species\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
};

const getSpeciesSpriteUrl = (id) => {
  if (!Number.isInteger(id) || id <= 0) return "";
  return `${SPRITE_CDN}/${id}.png`;
};

const getItemSpriteUrl = (itemName) => {
  if (!itemName) return "";
  return `${ITEM_SPRITE_CDN}/${itemName}.png`;
};

const getCategoryTags = (species) => {
  const tags = [];
  const name = species?.name || "";
  if (species?.is_legendary) tags.push("legendary");
  if (species?.is_mythical) tags.push("mythical");
  if (ULTRA_BEAST_SPECIES.has(name)) tags.push("ultra-beast");
  if (PARADOX_SPECIES.has(name)) tags.push("paradox");
  return tags;
};

const getPrimaryCategory = (species) => {
  const name = species?.name || "";
  if (species?.is_mythical) return "mythical";
  if (species?.is_legendary) return "legendary";
  if (ULTRA_BEAST_SPECIES.has(name)) return "ultra-beast";
  if (PARADOX_SPECIES.has(name)) return "paradox";
  return "standard";
};

const getRelativePhysicalStatsLabel = (value) => {
  if (value === 1) return "Atk > Def";
  if (value === -1) return "Atk < Def";
  if (value === 0) return "Atk = Def";
  return "";
};

const parseStoneMethodLabel = (methodLabel) => {
  if (typeof methodLabel !== "string") return null;
  const match = methodLabel.match(/^Use\s+(.+?\sStone)(?:\s·\s(.+))?$/i);
  if (!match) return null;
  const stoneLabel = match[1].replace(/\s+/g, " ").trim();
  const extraLabel = match[2] ? normalizeInlineText(match[2]) : "";
  const itemName = stoneLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!itemName) return null;
  return {
    label: stoneLabel,
    sprite: getItemSpriteUrl(itemName),
    extraLabel,
  };
};

const EVOLUTION_FORM_METHOD_OVERRIDES = {
  ninetales: [{ pattern: /\bIce Stone\b/i, suffix: "Alola" }],
  sandslash: [{ pattern: /\bIce Stone\b/i, suffix: "Alola" }],
  slowbro: [{ pattern: /\bGalarica Cuff\b/i, suffix: "Galar" }],
  slowking: [{ pattern: /\bGalarica Wreath\b/i, suffix: "Galar" }],
};

const getEvolutionFormSuffixForMethod = (speciesName, methodLabel) => {
  if (!speciesName || !methodLabel) return "";
  const rules = EVOLUTION_FORM_METHOD_OVERRIDES[speciesName] || [];
  const matchedRule = rules.find((rule) => rule.pattern.test(methodLabel));
  return matchedRule?.suffix || "";
};

const splitEvolutionEntryVariants = (entry) => {
  const labels = Array.isArray(entry.methodLabels) ? entry.methodLabels : [];
  const hasFormSpecificMethod = labels.some((methodLabel) =>
    Boolean(getEvolutionFormSuffixForMethod(entry.name, methodLabel)),
  );
  if (!hasFormSpecificMethod || labels.length <= 1) {
    return [{ label: entry.label, methodLabels: labels }];
  }
  return labels.map((methodLabel) => {
    const suffix = getEvolutionFormSuffixForMethod(entry.name, methodLabel);
    const variantLabel = suffix ? `${entry.label} (${suffix})` : entry.label;
    return {
      label: variantLabel,
      methodLabels: [methodLabel],
    };
  });
};

const formatEvolutionDetail = (detail) => {
  if (!detail || typeof detail !== "object") return "Special";
  const trigger = detail.trigger?.name || "";
  const parts = [];

  if (trigger === "use-item" && detail.item?.name) {
    parts.push(`Use ${capitalize(detail.item.name)}`);
  } else if (trigger === "trade") {
    if (detail.held_item?.name) {
      parts.push(`Trade holding ${capitalize(detail.held_item.name)}`);
    } else if (detail.trade_species?.name) {
      parts.push(`Trade for ${capitalize(detail.trade_species.name)}`);
    } else {
      parts.push("Trade");
    }
  } else if (trigger === "shed") {
    parts.push("Shed");
  } else if (trigger === "level-up") {
    if (detail.min_level) {
      parts.push(`Lvl ${detail.min_level}`);
    } else {
      parts.push("Level up");
    }
  } else if (trigger) {
    parts.push(capitalize(trigger));
  }

  if (detail.item?.name && trigger !== "use-item") {
    parts.push(`Use ${capitalize(detail.item.name)}`);
  }
  if (detail.min_happiness || detail.min_friendship) {
    parts.push("High friendship");
  }
  if (detail.min_affection) parts.push("High affection");
  if (detail.min_beauty) parts.push("High beauty");
  if (detail.time_of_day === "day") parts.push("Day");
  if (detail.time_of_day === "night") parts.push("Night");
  if (detail.gender === 1) parts.push("Female");
  if (detail.gender === 2) parts.push("Male");
  if (detail.known_move?.name) {
    parts.push(`Know ${capitalize(detail.known_move.name)}`);
  }
  if (detail.known_move_type?.name) {
    parts.push(`${capitalize(detail.known_move_type.name)} move`);
  }
  if (detail.location?.name) {
    parts.push(`At ${capitalize(detail.location.name)}`);
  }
  if (detail.party_species?.name) {
    parts.push(`With ${capitalize(detail.party_species.name)}`);
  }
  if (detail.party_type?.name) {
    parts.push(`${capitalize(detail.party_type.name)} in party`);
  }
  if (detail.needs_overworld_rain) parts.push("Rain");
  if (typeof detail.relative_physical_stats === "number") {
    const comparisonLabel = getRelativePhysicalStatsLabel(
      detail.relative_physical_stats,
    );
    if (comparisonLabel) parts.push(comparisonLabel);
  }
  if (detail.turn_upside_down) parts.push("Upside down");

  const unique = Array.from(new Set(parts.filter(Boolean)));
  return unique.length ? unique.join(" · ") : "Special";
};

const getEvolutionMethodLabels = (details) => {
  if (!Array.isArray(details) || !details.length) return [];
  const labels = details.map((detail) => formatEvolutionDetail(detail));
  return Array.from(new Set(labels.filter(Boolean)));
};

const buildEvolutionStages = (root) => {
  if (!root) return [];
  const stageMaps = [];

  const visitNode = (node, depth, parent = null) => {
    if (!node?.species?.name) return;
    if (!stageMaps[depth]) {
      stageMaps[depth] = new Map();
    }

    const speciesName = node.species.name;
    const id = getSpeciesIdFromUrl(node.species.url);
    const generation = getGenerationFromId(id);
    const parentGeneration = parent?.generation ?? null;
    const methodLabels = parent
      ? getEvolutionMethodLabels(node.evolution_details)
      : [];
    const isLaterGenEvolution =
      parentGeneration !== null &&
      generation !== null &&
      generation > parentGeneration;

    if (!stageMaps[depth].has(speciesName)) {
      stageMaps[depth].set(speciesName, {
        name: speciesName,
        label: capitalize(speciesName),
        id,
        sprite: getSpeciesSpriteUrl(id),
        generation,
        parentName: parent?.name || null,
        parentGeneration,
        isLaterGenEvolution,
        methodLabels,
      });
    } else {
      const existing = stageMaps[depth].get(speciesName);
      existing.methodLabels = Array.from(
        new Set([...existing.methodLabels, ...methodLabels]),
      );
      existing.isLaterGenEvolution =
        existing.isLaterGenEvolution || isLaterGenEvolution;
    }

    const current = stageMaps[depth].get(speciesName);
    const evolvesTo = Array.isArray(node.evolves_to) ? node.evolves_to : [];
    evolvesTo.forEach((next) => visitNode(next, depth + 1, current));
  };

  visitNode(root, 0);
  return stageMaps.filter(Boolean).map((stage) => Array.from(stage.values()));
};

const loadEvolutionLine = async (chainUrl) => {
  if (!chainUrl) return [];
  if (state.evolutionChainCache.has(chainUrl)) {
    return state.evolutionChainCache.get(chainUrl);
  }

  try {
    const chain = await fetchJson(chainUrl);
    const stages = buildEvolutionStages(chain.chain);
    state.evolutionChainCache.set(chainUrl, stages);
    return stages;
  } catch {
    state.evolutionChainCache.set(chainUrl, []);
    return [];
  }
};

const renderEvolutionLine = (stages, currentRawName) => {
  if (!els.evolutionLine) return;
  els.evolutionLine.innerHTML = "";

  if (!Array.isArray(stages) || stages.length === 0) {
    els.evolutionLine.hidden = true;
    return;
  }
  const totalEntries = stages.reduce(
    (sum, stage) => sum + (Array.isArray(stage) ? stage.length : 0),
    0,
  );
  if (totalEntries <= 1) {
    els.evolutionLine.hidden = true;
    return;
  }

  const flow = document.createElement("div");
  flow.className = "evo-flow";

  stages.forEach((stage, stageIndex) => {
    const stageEl = document.createElement("div");
    stageEl.className = "evo-stage";
    if (stage.length > 1) {
      stageEl.classList.add("is-branch");
    }

    stage.forEach((entry) => {
      const entryVariants = splitEvolutionEntryVariants(entry);
      entryVariants.forEach((variant) => {
        const branch = document.createElement("div");
        branch.className = "evo-branch";

        const node = document.createElement("span");
        node.className = "evo-node";
        const isVariantLabel = variant.label !== entry.label;
        if (entry.name === currentRawName && !isVariantLabel) {
          node.classList.add("is-current");
        }

        const sprite = document.createElement("img");
        sprite.className = "evo-sprite";
        sprite.alt = `${variant.label} sprite`;
        sprite.loading = "lazy";
        sprite.decoding = "async";
        if (entry.sprite) {
          sprite.src = entry.sprite;
          sprite.addEventListener("error", () => {
            sprite.classList.add("is-missing");
          });
        } else {
          sprite.classList.add("is-missing");
        }

        const label = document.createElement("span");
        label.className = "evo-name";
        label.textContent = variant.label;

        node.appendChild(sprite);
        node.appendChild(label);
        branch.appendChild(node);

        if (entry.isLaterGenEvolution && entry.generation) {
          const genBadge = document.createElement("span");
          genBadge.className = "evo-gen-badge";
          genBadge.textContent = `Gen ${entry.generation}`;
          branch.appendChild(genBadge);
        }

        if (variant.methodLabels.length) {
          const methods = document.createElement("div");
          methods.className = "evo-methods";
          variant.methodLabels.forEach((methodLabel) => {
            const method = document.createElement("span");
            method.className = "evo-method";
            const stoneMethod = parseStoneMethodLabel(methodLabel);
            if (stoneMethod) {
              method.classList.add("evo-method-stone");
              const stoneIcon = document.createElement("img");
              stoneIcon.className = "evo-method-stone-icon";
              stoneIcon.src = stoneMethod.sprite;
              stoneIcon.alt = `${stoneMethod.label} icon`;
              stoneIcon.loading = "lazy";
              stoneIcon.decoding = "async";
              stoneIcon.addEventListener("error", () => {
                stoneIcon.classList.add("is-missing");
              });
              const stoneName = document.createElement("span");
              stoneName.className = "evo-method-stone-name";
              stoneName.textContent = stoneMethod.label;
              method.appendChild(stoneIcon);
              method.appendChild(stoneName);
              if (stoneMethod.extraLabel) {
                const extraInfo = document.createElement("span");
                extraInfo.className = "evo-method-stone-extra";
                extraInfo.textContent = `· ${stoneMethod.extraLabel}`;
                method.appendChild(extraInfo);
              }
            } else {
              method.textContent = methodLabel;
            }
            methods.appendChild(method);
          });
          branch.appendChild(methods);
        }

        stageEl.appendChild(branch);
      });
    });

    flow.appendChild(stageEl);
    if (stageIndex < stages.length - 1) {
      const arrow = document.createElement("span");
      arrow.className = "evo-arrow";
      arrow.textContent = "→";
      flow.appendChild(arrow);
    }
  });

  els.evolutionLine.appendChild(flow);
  els.evolutionLine.hidden = false;
};

const renderTypes = (types, canMega = false, categoryTags = []) => {
  els.types.innerHTML = "";
  types.forEach((type) => {
    const typeName = type.type.name;
    const badge = document.createElement("span");
    badge.className = "type";
    badge.style.background = typeColors[typeName] || "#f0f0f0";
    const iconWrap = document.createElement("span");
    iconWrap.className = "type-chip-icon";
    const icon = document.createElement("img");
    icon.className = "type-chip-icon-img";
    icon.src = getTypeIconUrl(typeName);
    icon.alt = `${capitalize(typeName)} type icon`;
    icon.loading = "lazy";
    icon.decoding = "async";
    icon.addEventListener("error", () => {
      iconWrap.classList.add("is-missing");
      icon.remove();
    });
    iconWrap.appendChild(icon);
    badge.appendChild(iconWrap);
    const label = document.createElement("span");
    label.textContent = typeName;
    badge.appendChild(label);
    els.types.appendChild(badge);
  });

  if (canMega) {
    const megaBadge = document.createElement("span");
    megaBadge.className = "type-mega";
    megaBadge.setAttribute("aria-label", "Can Mega Evolve");
    megaBadge.title = "Can Mega Evolve";
    megaBadge.innerHTML = `<span class="mega-icon" aria-hidden="true"><img src="${MEGA_ICON_URL}" alt="" loading="lazy" decoding="async" /></span>`;
    els.types.appendChild(megaBadge);
  }

  categoryTags.forEach((tag, index) => {
    if (!CATEGORY_LABELS[tag]) return;
    const chip = document.createElement("span");
    chip.className = `category-chip category-${tag}`;
    if (index === 0) {
      chip.classList.add("category-chip-meta");
    }
    chip.textContent = CATEGORY_LABELS[tag];
    els.types.appendChild(chip);
  });
};

const setMainImage = (url) => {
  if (!url) return;
  state.currentImage = url;
  els.mainImage.src = url;
  Array.from(els.thumbs.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return;
    child.classList.toggle("active", child.dataset.url === url);
  });
};

const buildThumbnails = (urls, activeUrl) => {
  els.thumbs.innerHTML = "";
  urls.forEach((url) => {
    const button = document.createElement("button");
    button.className = "thumb";
    button.type = "button";
    button.dataset.url = url;
    if (url === activeUrl) {
      button.classList.add("active");
    }
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Pokemon alternate";
    button.appendChild(img);
    button.addEventListener("click", () => {
      setMainImage(url);
    });
    els.thumbs.appendChild(button);
  });
};

const setCardData = (pokemon) => {
  stopCryPlayback();
  els.name.textContent = pokemon.name;
  els.id.textContent = `#${String(pokemon.id).padStart(4, "0")}`;
  if (els.genLabel) {
    const gen = getGenerationFromId(pokemon.id);
    els.genLabel.textContent = gen ? `Gen ${gen}` : "Gen ?";
  }
  els.bio.textContent = pokemon.bio;
  renderEvolutionLine(pokemon.evolution, pokemon.rawName);
  els.stats.innerHTML = `${formatVitals(pokemon)}${formatAbilities(
    pokemon.abilities,
  )}${formatStats(pokemon.stats)}`;
  renderTypes(pokemon.types, pokemon.canMegaEvolve, pokemon.categoryTags);
  const primaryType = pokemon.types[0]?.type?.name;
  const accent = typeColors[primaryType] || "#ff6b2d";
  document.documentElement.style.setProperty("--type-accent", accent);

  const shiny = els.shinyMode.checked;
  const baseImage = shiny ? pokemon.images.shiny : pokemon.images.main;
  setMainImage(baseImage);
  els.mainImage.alt = pokemon.name;
  const spriteScale = getSpriteScale(pokemon);
  els.mainImage.style.setProperty("--sprite-scale", String(spriteScale));

  const gallery = pokemon.images.gallery.includes(baseImage)
    ? pokemon.images.gallery
    : [baseImage, ...pokemon.images.gallery];
  state.currentGallery = gallery;
  buildThumbnails(gallery, baseImage);

  const showStats = els.autoReveal.checked;
  els.card.classList.toggle("show-stats", showStats);
  updatePeekButton(showStats);
  updateFavoriteButton();
  updateCryButton();
};

const normalizeSprites = (sprites) => {
  const other = sprites.other || {};
  const gallery = [
    other["official-artwork"]?.front_default,
    other.home?.front_default,
    other.dream_world?.front_default,
    sprites.front_default,
    sprites.back_default,
    sprites.front_shiny,
    sprites.back_shiny,
  ].filter(Boolean);

  const main =
    other["official-artwork"]?.front_default ||
    other.home?.front_default ||
    sprites.front_default;
  const shiny = sprites.front_shiny || other.home?.front_shiny || main;

  return {
    main,
    shiny,
    gallery: Array.from(new Set(gallery)).slice(0, 6),
  };
};

const getAbilityDescription = (abilityData) => {
  const entries = Array.isArray(abilityData?.effect_entries)
    ? abilityData.effect_entries
    : [];
  const englishShort = entries.find(
    (entry) => entry.language?.name === "en" && entry.short_effect,
  );
  if (englishShort?.short_effect) {
    return normalizeInlineText(englishShort.short_effect);
  }
  const english = entries.find(
    (entry) => entry.language?.name === "en" && entry.effect,
  );
  if (english?.effect) {
    return normalizeInlineText(english.effect);
  }
  return "";
};

const loadAbilityDescription = async (abilityRef) => {
  const abilityName = abilityRef?.name || "";
  const abilityUrl = abilityRef?.url || "";
  const cacheKey = abilityUrl || abilityName;
  if (!cacheKey) return "";
  if (state.abilityEffectCache.has(cacheKey)) {
    return state.abilityEffectCache.get(cacheKey);
  }

  try {
    const payload = await fetchJson(abilityUrl || `${POKEAPI}/ability/${abilityName}`);
    const description =
      getAbilityDescription(payload) || "No description available yet.";
    state.abilityEffectCache.set(cacheKey, description);
    return description;
  } catch {
    const fallback = "No description available yet.";
    state.abilityEffectCache.set(cacheKey, fallback);
    return fallback;
  }
};

const loadTypeIndex = async (type) => {
  if (state.typeIndex.has(type)) {
    return state.typeIndex.get(type);
  }
  const data = await fetchJson(`${POKEAPI}/type/${type}`);
  const names = new Set(data.pokemon.map((entry) => entry.pokemon.name));
  state.typeIndex.set(type, names);
  return names;
};

const filterByTypes = async (names) => {
  if (state.selectedTypes.size === 0) {
    return [];
  }
  if (state.selectedTypes.size === TYPE_LIST.length) {
    return names;
  }

  const sets = await Promise.all(
    Array.from(state.selectedTypes.values()).map((type) => loadTypeIndex(type)),
  );
  const allowed = new Set();
  sets.forEach((set) => {
    set.forEach((name) => allowed.add(name));
  });

  return names.filter((name) => allowed.has(name));
};

const loadPokemon = async (name) => {
  if (state.cache.has(name)) {
    return state.cache.get(name);
  }

  const [details, species] = await Promise.all([
    fetchJson(`${POKEAPI}/pokemon/${name}`),
    fetchJson(`${POKEAPI}/pokemon-species/${name}`),
  ]);
  const evolution = await loadEvolutionLine(species.evolution_chain?.url);
  const abilities = (
    await Promise.all(
      details.abilities.map(async (entry) => {
        const abilityName = entry.ability?.name || "";
        if (!abilityName) return null;
        const description = await loadAbilityDescription({
          name: abilityName,
          url: entry.ability?.url || "",
        });
        return {
          name: abilityName,
          isHidden: Boolean(entry.is_hidden),
          slot: Number(entry.slot) || 99,
          description,
        };
      }),
    )
  ).filter(Boolean);

  const generation = getGenerationFromId(details.id);
  const typeNames = [...details.types]
    .sort((a, b) => (a.slot || 0) - (b.slot || 0))
    .map((entry) => entry.type.name);
  const baseStatTotal = details.stats.reduce(
    (sum, stat) => sum + (Number(stat.base_stat) || 0),
    0,
  );

  const pokemon = {
    id: details.id,
    rawName: details.name,
    name: capitalize(details.name),
    generation,
    height: details.height,
    weight: details.weight,
    typeNames,
    baseStatTotal,
    category: getPrimaryCategory(species),
    speciesColor: species.color?.name || "unknown",
    habitat: species.habitat?.name || "unknown",
    nameLength: details.name.length,
    abilities,
    categoryTags: getCategoryTags(species),
    cry: details.cries?.latest || details.cries?.legacy || "",
    canMegaEvolve: MEGA_EVOLUTION_SPECIES.has(
      details.species?.name || details.name,
    ),
    evolution,
    types: details.types,
    stats: details.stats,
    bio: chooseFlavorText(species.flavor_text_entries),
    images: normalizeSprites(details.sprites),
    thumb:
      details.sprites.front_default ||
      details.sprites.other?.["official-artwork"]?.front_default ||
      details.sprites.other?.home?.front_default ||
      details.sprites.back_default,
  };

  state.cache.set(name, pokemon);
  return pokemon;
};

const preloadImages = (urls) => {
  urls.forEach((url) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
  });
};

const prefetchUpcoming = () => {
  const upcoming = state.queue.slice(0, PRELOAD_COUNT);
  upcoming.forEach(async (name) => {
    try {
      const pokemon = await loadPokemon(name);
      preloadImages(pokemon.images.gallery);
    } catch {
      // Ignore preload failures
    }
  });
};

const updateUndoLabel = () => {
  const count = state.history.length;
  const label = count ? `Undo (${count})` : "Undo";
  els.undoBtn.textContent = label;
  if (els.mobileUndoBtn) {
    els.mobileUndoBtn.textContent = label;
  }
};

const updateFavoriteButton = () => {
  if (!state.current) return;
  const exists = state.favorites.some((fav) => fav.name === state.current.name);
  if (!els.favoriteBtn) return;
  els.favoriteBtn.classList.toggle("is-saved", exists);
  els.favoriteBtn.setAttribute("aria-pressed", String(exists));
  els.favoriteBtn.setAttribute(
    "aria-label",
    exists ? "Remove from saved Pokemon" : "Save Pokemon",
  );
};

const updatePeekButton = (showStats) => {
  if (!els.peekBtn) return;
  els.peekBtn.textContent = showStats ? "Hide stats" : "Peek stats";
  els.peekBtn.dataset.open = showStats ? "true" : "false";
};

const stopCryPlayback = () => {
  if (state.cryAudio) {
    state.cryAudio.pause();
    state.cryAudio.currentTime = 0;
    state.cryAudio = null;
  }
  if (els.cryBtn) {
    els.cryBtn.classList.remove("is-playing");
  }
};

const updateCryButton = () => {
  if (!els.cryBtn) return;
  const hasCry = Boolean(state.current?.cry);
  els.cryBtn.disabled = !hasCry;
  els.cryBtn.classList.toggle("is-disabled", !hasCry);
  els.cryBtn.title = hasCry ? "Play cry" : "No cry available";
  els.cryBtn.setAttribute(
    "aria-label",
    hasCry ? "Play Pokemon cry" : "No cry available for this Pokemon",
  );
  if (!hasCry) {
    els.cryBtn.classList.remove("is-playing");
  }
};

const playCry = async () => {
  if (!state.current?.cry || !els.cryBtn) return;
  stopCryPlayback();
  const audio = new Audio(state.current.cry);
  state.cryAudio = audio;
  els.cryBtn.classList.add("is-playing");

  const cleanup = () => {
    if (state.cryAudio === audio) {
      state.cryAudio = null;
    }
    els.cryBtn.classList.remove("is-playing");
  };

  audio.addEventListener("ended", cleanup, { once: true });
  audio.addEventListener("error", cleanup, { once: true });

  try {
    await audio.play();
  } catch {
    cleanup();
  }
};

const setPanelOpen = (open) => {
  if (!els.panel) return;
  if (open) {
    setMobileHubOpen(false);
  }
  els.panel.classList.toggle("is-open", open);
  document.body.classList.toggle("panel-open", open);
  if (els.mobileFilters) {
    els.mobileFilters.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (els.panelOverlay) {
    els.panelOverlay.classList.toggle("is-open", open);
    els.panelOverlay.setAttribute("aria-hidden", open ? "false" : "true");
  }
};

const updateMobileFilterBar = () => {
  if (!els.filterCounts) return;
  const genTotal = GEN_COUNT;
  const typeTotal = TYPE_LIST.length;
  const genCount = state.selectedGens.size;
  const typeCount = state.selectedTypes.size;
  els.filterCounts.textContent = `${genCount}/${genTotal} gens · ${typeCount}/${typeTotal} types`;

  const syncToggle = (button, input) => {
    if (!button || !input) return;
    const active = input.checked;
    button.classList.toggle("is-on", active);
    button.setAttribute("aria-pressed", String(active));
  };

  syncToggle(els.mobileDaily, els.dailyDeck);
  syncToggle(els.mobileShiny, els.shinyMode);
};

const setMobileHistoryPanelOpen = (lane, open) => {
  const isSmash = lane === "smash";
  const toggle = isSmash ? els.mobileHubSmashToggle : els.mobileHubPassToggle;
  const panel = isSmash ? els.mobileHubSmashPanel : els.mobileHubPassPanel;
  if (!toggle || !panel) return;
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  toggle.classList.toggle("is-open", open);
  panel.hidden = !open;
};

const setMobileHubOpen = (open) => {
  if (!els.mobileHub || !els.mobileHubToggle) return;
  if (state.activeMode !== "smash" && open) return;
  state.mobileHubOpen = open;
  els.mobileHub.classList.toggle("is-open", open);
  els.mobileHub.setAttribute("aria-hidden", open ? "false" : "true");
  els.mobileHubToggle.setAttribute("aria-expanded", open ? "true" : "false");
  document.body.classList.toggle("mobile-hub-open", open);
  if (!open) {
    setMobileHistoryPanelOpen("smash", false);
    setMobileHistoryPanelOpen("pass", false);
  }
};

const createFavoriteChip = (entry) => {
  const chip = document.createElement("span");
  chip.className = "collect-item";
  if (entry.thumb) {
    const img = document.createElement("img");
    img.src = entry.thumb;
    img.alt = entry.name;
    chip.appendChild(img);
  }
  const label = document.createElement("span");
  label.textContent = entry.name;
  chip.appendChild(label);
  return chip;
};

const renderFavorites = () => {
  const targets = [els.favoriteList, els.mobileFavoriteList].filter(Boolean);
  targets.forEach((container) => {
    container.innerHTML = "";
    if (!state.favorites.length && container === els.mobileFavoriteList) {
      const empty = document.createElement("span");
      empty.className = "mobile-favorites-empty";
      empty.textContent = "No saved Pokemon yet";
      container.appendChild(empty);
      return;
    }
    state.favorites.forEach((entry) => {
      container.appendChild(createFavoriteChip(entry));
    });
  });
  if (els.mobileFavoritesCount) {
    els.mobileFavoritesCount.textContent = String(state.favorites.length);
  }
};

const toggleFavorite = () => {
  if (!state.current) return;
  const existingIndex = state.favorites.findIndex(
    (fav) => fav.name === state.current.name,
  );
  if (existingIndex >= 0) {
    state.favorites.splice(existingIndex, 1);
  } else {
    state.favorites.unshift({
      name: state.current.name,
      thumb: state.current.thumb || state.current.images.main,
    });
  }
  renderFavorites();
  saveFavorites();
  updateFavoriteButton();
};

const downloadFile = (filename, content, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const exportFavorites = (format) => {
  if (!state.favorites.length) return;
  if (format === "json") {
    downloadFile(
      "smashdex-favorites.json",
      JSON.stringify(state.favorites, null, 2),
      "application/json",
    );
    return;
  }
  const header = "name";
  const rows = state.favorites.map(
    (fav) => `"${fav.name.replace(/\"/g, '""')}"`,
  );
  downloadFile(
    "smashdex-favorites.csv",
    [header, ...rows].join("\n"),
    "text/csv",
  );
};

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const shareMatchCard = async () => {
  if (!state.favorites.length && !state.smashing.length) return;
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 520;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#ffe9c7");
  gradient.addColorStop(1, "#c4f3e8");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#14130f";
  ctx.font = "36px Bungee, sans-serif";
  ctx.fillText("SmashDex", 40, 70);
  ctx.font = "18px IBM Plex Sans, sans-serif";
  ctx.fillText(`Smash ${state.smashCount} · Pass ${state.passCount}`, 40, 105);

  const items = (
    state.favorites.length ? state.favorites : state.smashing
  ).slice(0, 8);
  const startX = 40;
  const startY = 150;
  const gap = 110;
  const rowGap = 150;

  const images = await Promise.all(items.map((item) => loadImage(item.thumb)));

  items.forEach((item, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const x = startX + col * gap;
    const y = startY + row * rowGap;

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.strokeStyle = "#14130f";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, x, y, 96, 96, 18);
    ctx.fill();
    ctx.stroke();

    const img = images[index];
    if (img) {
      ctx.drawImage(img, x + 16, y + 10, 64, 64);
    }
    ctx.fillStyle = "#14130f";
    ctx.font = "12px IBM Plex Sans, sans-serif";
    ctx.fillText(item.name.toUpperCase(), x + 6, y + 90);
  });

  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = "smashdex-card.png";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const renderBadges = () => {
  const badges = [];
  if (state.smashStreak >= 5) badges.push("Hot Streak");
  if (state.passStreak >= 5) badges.push("Cold Streak");

  const typeEntries = Array.from(state.smashTypeCounts.entries()).sort(
    (a, b) => b[1] - a[1],
  );
  if (typeEntries[0]?.[1] >= 6) {
    badges.push(`${capitalize(typeEntries[0][0])} Loyalist`);
  }

  const totals = state.smashStatTotals;
  if (state.smashCount > 0) {
    const avgSpeed = Math.round((totals.speed || 0) / state.smashCount);
    const avgAtk = Math.round((totals.attack || 0) / state.smashCount);
    const avgSpAtk = Math.round(
      (totals["special-attack"] || 0) / state.smashCount,
    );
    const avgDef = Math.round((totals.defense || 0) / state.smashCount);
    const avgSpDef = Math.round(
      (totals["special-defense"] || 0) / state.smashCount,
    );

    if (avgSpeed >= 90) badges.push("Speed Demon");
    if (avgAtk + avgSpAtk >= 160 && avgDef + avgSpDef < 120) {
      badges.push("Glass Cannon");
    }
    if (avgDef + avgSpDef >= 160) badges.push("Tank Mode");
  }

  els.badgeList.innerHTML = "";
  const unique = Array.from(new Set(badges)).slice(0, 5);
  unique.forEach((badge) => {
    const chip = document.createElement("span");
    chip.className = "badge-chip";
    chip.textContent = badge;
    els.badgeList.appendChild(chip);
  });
};

const applySmashStats = (pokemon, delta) => {
  if (!pokemon) return;
  pokemon.types.forEach((type) => {
    const name = type.type.name;
    const current = state.smashTypeCounts.get(name) || 0;
    const next = current + delta;
    if (next <= 0) {
      state.smashTypeCounts.delete(name);
    } else {
      state.smashTypeCounts.set(name, next);
    }
  });

  pokemon.stats.forEach((stat) => {
    const key = stat.stat.name;
    const current = state.smashStatTotals[key] || 0;
    const next = current + stat.base_stat * delta;
    state.smashStatTotals[key] = Math.max(0, next);
  });
};

const recomputeStreaks = () => {
  let smashStreak = 0;
  let passStreak = 0;
  for (let i = state.history.length - 1; i >= 0; i -= 1) {
    const direction = state.history[i].direction;
    if (direction === "smash") {
      if (passStreak > 0) break;
      smashStreak += 1;
    } else {
      if (smashStreak > 0) break;
      passStreak += 1;
    }
  }
  state.smashStreak = smashStreak;
  state.passStreak = passStreak;
};

const buildSummary = () => {
  const totalSwipes = state.smashCount + state.passCount;
  const smashRate = totalSwipes
    ? Math.round((state.smashCount / totalSwipes) * 100)
    : 0;

  const typeEntries = Array.from(state.smashTypeCounts.entries()).sort(
    (a, b) => b[1] - a[1],
  );
  const topTypes = typeEntries.slice(0, 3).map(([type, count]) => ({
    type: capitalize(type),
    count,
  }));

  const totals = state.smashStatTotals;
  const avgStats = [
    "attack",
    "defense",
    "special-attack",
    "special-defense",
    "speed",
  ].map((key) => ({
    label: capitalize(key.replace("-", " ")),
    value: state.smashCount
      ? Math.round((totals[key] || 0) / state.smashCount)
      : 0,
  }));

  return { totalSwipes, smashRate, topTypes, avgStats };
};

const toggleModal = (modal, open) => {
  if (!modal) return;
  modal.classList.toggle("is-open", open);
  modal.setAttribute("aria-hidden", open ? "false" : "true");
};

const showSummaryIfNeeded = () => {
  const totalSwipes = state.smashCount + state.passCount;
  if (!totalSwipes || totalSwipes % SUMMARY_INTERVAL !== 0) return;

  const summary = buildSummary();
  els.summaryContent.innerHTML = `
    <div><strong>${summary.totalSwipes}</strong> swipes · <strong>${summary.smashRate}%</strong> smash rate</div>
    <div><strong>Top types:</strong> ${
      summary.topTypes
        .map((entry) => `${entry.type} (${entry.count})`)
        .join(", ") || "None yet"
    }</div>
    <div><strong>Avg stats:</strong> ${summary.avgStats
      .map((stat) => `${stat.label} ${stat.value}`)
      .join(" · ")}</div>
  `;
  toggleModal(els.summaryModal, true);
};

const setBlockDisabled = (block, disabled) => {
  if (!block) return;
  block.classList.toggle("is-disabled", disabled);
  block.querySelectorAll("input, button, select").forEach((control) => {
    control.disabled = disabled;
  });
};

const updateModeSpecificControls = () => {
  const inGuessMode = state.activeMode === "guess";
  setBlockDisabled(els.typeFilterBlock, inGuessMode);
  setBlockDisabled(els.deckOptionsBlock, inGuessMode);

  if (els.mobileDaily) {
    els.mobileDaily.disabled = inGuessMode;
    els.mobileDaily.classList.toggle("is-disabled", inGuessMode);
  }
  if (els.mobileShiny) {
    els.mobileShiny.disabled = inGuessMode;
    els.mobileShiny.classList.toggle("is-disabled", inGuessMode);
  }
};

const syncModeUi = () => {
  const isSmash = state.activeMode === "smash";
  document.documentElement.classList.toggle("guess-mode", !isSmash);
  document.body.classList.toggle("guess-mode", !isSmash);

  if (els.smashModePane) {
    els.smashModePane.hidden = !isSmash;
    els.smashModePane.classList.toggle("is-active", isSmash);
  }
  if (els.guessModePane) {
    els.guessModePane.hidden = isSmash;
    els.guessModePane.classList.toggle("is-active", !isSmash);
  }

  if (els.modeSmashBtn) {
    els.modeSmashBtn.classList.toggle("is-active", isSmash);
    els.modeSmashBtn.setAttribute("aria-selected", isSmash ? "true" : "false");
  }
  if (els.modeGuessBtn) {
    els.modeGuessBtn.classList.toggle("is-active", !isSmash);
    els.modeGuessBtn.setAttribute("aria-selected", isSmash ? "false" : "true");
  }

  updateModeSpecificControls();
};

const loadGenerationRoster = async (genId) => {
  if (state.genRosterCache.has(genId)) {
    return state.genRosterCache.get(genId);
  }
  const generation = await fetchJson(`${POKEAPI}/generation/${genId}`);
  const names = generation.pokemon_species.map((entry) => entry.name);
  state.genRosterCache.set(genId, names);
  return names;
};

const loadSelectedGenerationRoster = async () => {
  const genIds = Array.from(state.selectedGens.values()).sort((a, b) => a - b);
  if (!genIds.length) return [];
  const rosters = await Promise.all(genIds.map((id) => loadGenerationRoster(id)));
  return Array.from(new Set(rosters.flat()));
};

const buildGuessRosterFromSelectedGens = async () => {
  const roster = await loadSelectedGenerationRoster();
  state.guessRoster = roster;
  state.guessSearchEntries = roster.map((name) => {
    const normalized = normalizeGuessToken(name);
    return {
      rawName: name,
      normalized,
      compact: normalized.replace(/-/g, ""),
    };
  });

  const lookup = new Map();
  roster.forEach((name) => {
    const pretty = capitalize(name);
    const aliases = [
      name,
      pretty,
      name.replace(/-/g, " "),
      pretty.replace(/-/g, " "),
      name.replace(/-/g, ""),
      pretty.replace(/\s+/g, ""),
    ];
    aliases.forEach((alias) => {
      const token = normalizeGuessToken(alias);
      if (!token || lookup.has(token)) return;
      lookup.set(token, name);
    });
  });
  state.guessNameLookup = lookup;

  if (els.guessNameList) {
    els.guessNameList.innerHTML = "";
    roster.forEach((name) => {
      const option = document.createElement("option");
      option.value = capitalize(name);
      els.guessNameList.appendChild(option);
    });
  }

  return roster;
};

const closeGuessSuggestions = () => {
  state.guessSuggestionsOpen = false;
  state.guessSuggestionNames = [];
  state.guessSuggestionIndex = -1;

  if (els.guessSuggestions) {
    els.guessSuggestions.hidden = true;
  }
  if (els.guessSuggestionsList) {
    els.guessSuggestionsList.innerHTML = "";
  }
  if (els.guessInput) {
    els.guessInput.setAttribute("aria-expanded", "false");
    els.guessInput.removeAttribute("aria-activedescendant");
  }
};

const getGuessAutocompleteNames = (rawValue) => {
  const token = normalizeGuessToken(rawValue);
  const compactToken = token.replace(/-/g, "");
  if (!token) return [];

  const exact = [];
  const prefix = [];
  const contains = [];

  state.guessSearchEntries.forEach((entry) => {
    if (
      entry.normalized === token ||
      (compactToken && entry.compact === compactToken)
    ) {
      exact.push(entry.rawName);
      return;
    }

    if (
      entry.normalized.startsWith(token) ||
      (compactToken && entry.compact.startsWith(compactToken))
    ) {
      prefix.push(entry.rawName);
      return;
    }

    if (
      entry.normalized.includes(token) ||
      (compactToken && entry.compact.includes(compactToken))
    ) {
      contains.push(entry.rawName);
    }
  });

  return [...exact, ...prefix, ...contains].slice(0, GUESS_SUGGESTION_LIMIT);
};

const renderGuessSuggestions = () => {
  if (!els.guessSuggestions || !els.guessSuggestionsList || !els.guessInput) return;

  const shouldShow =
    state.guessSuggestionsOpen &&
    state.guessSuggestionNames.length > 0 &&
    isMobileView() &&
    state.activeMode === "guess" &&
    state.guess.status === "playing" &&
    !els.guessInput.disabled;

  els.guessSuggestions.hidden = !shouldShow;
  els.guessInput.setAttribute("aria-expanded", shouldShow ? "true" : "false");
  els.guessInput.removeAttribute("aria-activedescendant");
  els.guessSuggestionsList.innerHTML = "";

  if (!shouldShow) return;

  state.guessSuggestionNames.forEach((rawName, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "guess-suggestion-item";
    option.dataset.guessName = rawName;
    option.textContent = capitalize(rawName);
    option.setAttribute("role", "option");
    option.id = `guessSuggestionOption${index}`;

    const isActive = index === state.guessSuggestionIndex;
    option.setAttribute("aria-selected", isActive ? "true" : "false");
    if (isActive) {
      option.classList.add("is-active");
      els.guessInput.setAttribute("aria-activedescendant", option.id);
    }

    els.guessSuggestionsList.appendChild(option);
  });
};

const updateGuessSuggestions = ({ preserveActive = true } = {}) => {
  if (!els.guessInput) return;

  if (
    !isMobileView() ||
    state.activeMode !== "guess" ||
    state.guess.status !== "playing" ||
    els.guessInput.disabled
  ) {
    closeGuessSuggestions();
    return;
  }

  const nextNames = getGuessAutocompleteNames(els.guessInput.value);
  if (!nextNames.length) {
    closeGuessSuggestions();
    return;
  }

  const activeName =
    preserveActive && state.guessSuggestionIndex >= 0
      ? state.guessSuggestionNames[state.guessSuggestionIndex]
      : "";

  state.guessSuggestionNames = nextNames;
  state.guessSuggestionsOpen = true;
  state.guessSuggestionIndex = activeName
    ? nextNames.indexOf(activeName)
    : -1;
  renderGuessSuggestions();
};

const applyGuessSuggestion = (rawName) => {
  if (!rawName || !els.guessInput) return;
  els.guessInput.value = capitalize(rawName);
  closeGuessSuggestions();
  els.guessInput.focus();
};

const handleGuessSuggestionClick = (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const option = target.closest(".guess-suggestion-item");
  if (!option || !els.guessSuggestionsList?.contains(option)) return;

  const rawName = option.dataset.guessName;
  if (!rawName) return;
  applyGuessSuggestion(rawName);
};

const handleGuessInputKeydown = (event) => {
  if (event.key === "Escape") {
    closeGuessSuggestions();
    return;
  }

  if (!state.guessSuggestionsOpen || !state.guessSuggestionNames.length) {
    if (event.key !== "ArrowDown") return;
    updateGuessSuggestions({ preserveActive: false });
    if (!state.guessSuggestionsOpen) return;
    state.guessSuggestionIndex = 0;
    renderGuessSuggestions();
    event.preventDefault();
    return;
  }

  const count = state.guessSuggestionNames.length;
  if (!count) {
    closeGuessSuggestions();
    return;
  }

  if (event.key === "ArrowDown") {
    state.guessSuggestionIndex =
      state.guessSuggestionIndex < 0
        ? 0
        : (state.guessSuggestionIndex + 1) % count;
    renderGuessSuggestions();
    event.preventDefault();
    return;
  }

  if (event.key === "ArrowUp") {
    state.guessSuggestionIndex =
      state.guessSuggestionIndex < 0
        ? count - 1
        : (state.guessSuggestionIndex - 1 + count) % count;
    renderGuessSuggestions();
    event.preventDefault();
    return;
  }

  if (event.key === "Enter") {
    if (state.guessSuggestionIndex < 0) {
      return;
    }
    const index = state.guessSuggestionIndex;
    const rawName = state.guessSuggestionNames[index];
    if (!rawName) return;
    event.preventDefault();
    applyGuessSuggestion(rawName);
  }
};

const formatGuessDirection = (guessValue, targetValue, formatValue) => {
  if (!Number.isFinite(guessValue) || !Number.isFinite(targetValue)) {
    return {
      state: "miss",
      label: formatValue(guessValue),
    };
  }
  if (guessValue === targetValue) {
    return {
      state: "exact",
      label: formatValue(guessValue),
    };
  }
  const arrow = targetValue > guessValue ? "↑" : "↓";
  return {
    state: "direction",
    label: `${formatValue(guessValue)} ${arrow}`,
  };
};

const compareGuessPokemon = (guessPokemon, targetPokemon) => {
  const isCorrect = guessPokemon.rawName === targetPokemon.rawName;
  const guessTypeSet = new Set(guessPokemon.typeNames || []);
  const targetTypeSet = new Set(targetPokemon.typeNames || []);
  const sharedTypes = Array.from(guessTypeSet).filter((type) =>
    targetTypeSet.has(type),
  );
  const exactTypeMatch =
    guessTypeSet.size === targetTypeSet.size &&
    Array.from(guessTypeSet).every((type) => targetTypeSet.has(type));

  return {
    rawName: guessPokemon.rawName,
    isCorrect,
    cells: {
      name: {
        state: isCorrect ? "exact" : "miss",
        label: guessPokemon.name,
      },
      generation: formatGuessDirection(
        guessPokemon.generation,
        targetPokemon.generation,
        (value) => `Gen ${value ?? "?"}`,
      ),
      type: {
        state: exactTypeMatch ? "exact" : sharedTypes.length ? "partial" : "miss",
        label: humanizeTypeList(guessPokemon.typeNames),
      },
      height: formatGuessDirection(
        guessPokemon.height,
        targetPokemon.height,
        (value) => `${formatMeters(value)} m`,
      ),
      weight: formatGuessDirection(
        guessPokemon.weight,
        targetPokemon.weight,
        (value) => `${formatKilograms(value)} kg`,
      ),
      bst: formatGuessDirection(
        guessPokemon.baseStatTotal,
        targetPokemon.baseStatTotal,
        (value) => String(value ?? "?"),
      ),
      category: {
        state: guessPokemon.category === targetPokemon.category ? "exact" : "miss",
        label:
          CATEGORY_LABELS[guessPokemon.category] ||
          capitalize(guessPokemon.category || "standard"),
      },
    },
  };
};

const buildGuessCluePlan = (targetPokemon) => {
  if (!targetPokemon) return [];

  const typeNames = Array.isArray(targetPokemon.typeNames)
    ? targetPokemon.typeNames
    : [];
  const randomType =
    typeNames[Math.floor(Math.random() * Math.max(typeNames.length, 1))] ||
    "unknown";

  const typeHints = [
    {
      id: "type-signal",
      label: "Type signal",
      value: `One of its types is ${capitalize(randomType)}`,
    },
    {
      id: "type-profile",
      label: "Type profile",
      value: typeNames.length > 1 ? "This Pokemon is dual-type." : "This Pokemon is single-type.",
    },
    {
      id: "type-family",
      label: "Type family",
      value: humanizeTypeList(typeNames),
    },
  ];
  const selectedTypeHint =
    typeHints[Math.floor(Math.random() * typeHints.length)];

  const habitatLabel =
    targetPokemon.habitat && targetPokemon.habitat !== "unknown"
      ? capitalize(targetPokemon.habitat)
      : `${capitalize(targetPokemon.speciesColor || "unknown")} color`;

  const categoryLabel =
    CATEGORY_LABELS[targetPokemon.category] ||
    capitalize(targetPokemon.category || "standard");

  const pool = [
    { id: "generation", label: "Generation", value: `Gen ${targetPokemon.generation || "?"}` },
    { id: "habitat", label: "Habitat / color", value: habitatLabel },
    { id: "category", label: "Category", value: categoryLabel },
    {
      id: "physical-profile",
      label: "Physical profile",
      value: `${formatMeters(targetPokemon.height)} m · ${formatKilograms(targetPokemon.weight)} kg`,
    },
    { id: "height", label: "Height", value: `${formatMeters(targetPokemon.height)} m` },
    { id: "weight", label: "Weight", value: `${formatKilograms(targetPokemon.weight)} kg` },
    {
      id: "bst",
      label: "Base stat total",
      value: `${targetPokemon.baseStatTotal} BST`,
    },
    {
      id: "name-start",
      label: "Name start",
      value: `Starts with ${targetPokemon.name.charAt(0)}`,
    },
    {
      id: "name-shape",
      label: "Name shape",
      value: `${targetPokemon.nameLength} letters`,
    },
    {
      id: "name-end",
      label: "Name ending",
      value: `Ends with ${targetPokemon.name.charAt(targetPokemon.name.length - 1)}`,
    },
  ];

  const selected = [selectedTypeHint, ...shuffle(pool).slice(0, 4)];
  return selected;
};

const getGuessMissCount = () => {
  if (state.guess.status === "won") {
    return Math.max(0, state.guess.attempts - 1);
  }
  return state.guess.attempts;
};

const renderGuessClues = () => {
  if (!els.guessClues) return;
  els.guessClues.innerHTML = "";

  const target = state.guess.targetPokemon;
  if (!target) {
    const empty = document.createElement("p");
    empty.className = "guess-clue-empty";
    empty.textContent = "Select at least one generation to start.";
    els.guessClues.appendChild(empty);
    return;
  }
  const clues = Array.isArray(state.guess.clues) ? state.guess.clues : [];
  if (!clues.length) {
    const empty = document.createElement("p");
    empty.className = "guess-clue-empty";
    empty.textContent = "Clues are loading...";
    els.guessClues.appendChild(empty);
    return;
  }

  const misses = getGuessMissCount();
  let revealCount = Math.min(clues.length, misses);
  if (state.guess.status === "won" || state.guess.status === "lost") {
    revealCount = clues.length;
  }

  clues.forEach((clue, index) => {
    const unlocked = index < revealCount;
    const row = document.createElement("div");
    row.className = "guess-clue";
    row.classList.add(unlocked ? "is-unlocked" : "is-locked");

    const key = document.createElement("span");
    key.className = "guess-clue-key";
    key.textContent = clue.label;

    const value = document.createElement("span");
    value.className = "guess-clue-value";
    value.textContent = unlocked ? clue.value : "Locked";

    row.appendChild(key);
    row.appendChild(value);
    els.guessClues.appendChild(row);
  });
};

const renderGuessHistory = () => {
  if (!els.guessHistory) return;
  els.guessHistory.innerHTML = "";

  if (!state.guess.guesses.length) {
    const empty = document.createElement("p");
    empty.className = "guess-history-empty";
    empty.textContent = "No guesses yet.";
    els.guessHistory.appendChild(empty);
    return;
  }

  const columns = [
    ["name", "Name"],
    ["generation", "Gen"],
    ["type", "Type"],
    ["height", "Height"],
    ["weight", "Weight"],
    ["bst", "BST"],
    ["category", "Category"],
  ];

  state.guess.guesses.forEach((guessRow) => {
    const row = document.createElement("div");
    row.className = "guess-row";
    if (guessRow.isCorrect) {
      row.classList.add("is-correct");
    }

    columns.forEach(([key, label]) => {
      const cellData = guessRow.cells[key];
      const cell = document.createElement("span");
      cell.className = `guess-cell guess-cell-${cellData.state || "miss"}`;
      cell.dataset.col = label;
      cell.textContent = cellData.label;
      row.appendChild(cell);
    });

    els.guessHistory.appendChild(row);
  });
};

const renderGuessMode = () => {
  const target = state.guess.targetPokemon;
  const isFinished =
    state.guess.status === "won" || state.guess.status === "lost";
  const isPlayable = state.guess.status === "playing" && Boolean(target);

  if (els.guessTargetCard) {
    els.guessTargetCard.classList.toggle("is-concealed", Boolean(target) && !isFinished);
  }
  if (els.guessTargetImage) {
    if (target?.images?.main) {
      els.guessTargetImage.src = target.images.main;
      els.guessTargetImage.alt = isFinished
        ? `${target.name} artwork`
        : "Hidden Pokemon silhouette";
    } else {
      els.guessTargetImage.removeAttribute("src");
      els.guessTargetImage.alt = "No Pokemon selected";
    }
  }
  if (els.guessTargetName) {
    if (!target) {
      els.guessTargetName.textContent = "Pick generations to start";
    } else if (isFinished) {
      els.guessTargetName.textContent = target.name;
    } else {
      els.guessTargetName.textContent = "Who's that Pokemon?";
    }
  }
  if (els.guessTargetMeta) {
    if (target && isFinished) {
      const categoryLabel =
        CATEGORY_LABELS[target.category] || capitalize(target.category || "standard");
      els.guessTargetMeta.hidden = false;
      els.guessTargetMeta.textContent = `#${String(target.id).padStart(4, "0")} · ${humanizeTypeList(target.typeNames)} · ${categoryLabel}`;
    } else {
      els.guessTargetMeta.hidden = true;
      els.guessTargetMeta.textContent = "";
    }
  }
  if (els.guessAttempts) {
    els.guessAttempts.textContent = `${state.guess.attempts} / ${GUESS_MAX_ATTEMPTS} guesses`;
  }
  if (els.guessLive) {
    els.guessLive.textContent = state.guess.message || "";
  }
  if (els.guessInput) {
    els.guessInput.disabled = !isPlayable;
  }
  if (els.guessSubmitBtn) {
    els.guessSubmitBtn.disabled = !isPlayable;
  }
  if (els.guessNextBtn) {
    els.guessNextBtn.hidden = !isFinished;
  }
  if (!isPlayable || !isMobileView()) {
    closeGuessSuggestions();
  } else {
    updateGuessSuggestions();
  }

  renderGuessClues();
  renderGuessHistory();
  updateCounts();
};

const finishGuessRound = (result) => {
  if (!state.guess.targetPokemon) return;
  if (result !== "won" && result !== "lost") return;

  state.guess.status = result;
  state.guessStats.played += 1;
  if (result === "won") {
    state.guessStats.wins += 1;
    state.guessStats.streak += 1;
    state.guess.message = `Correct! ${state.guess.targetPokemon.name} in ${state.guess.attempts}/${GUESS_MAX_ATTEMPTS}.`;
  } else {
    state.guessStats.streak = 0;
    state.guess.message = `Out of guesses. It was ${state.guess.targetPokemon.name}.`;
  }
  state.guessStats.bestStreak = Math.max(
    state.guessStats.bestStreak,
    state.guessStats.streak,
  );
  saveGuessStats();
  renderGuessMode();
};

const startGuessRound = async () => {
  const token = ++state.guessRoundToken;
  state.guess.targetName = "";
  state.guess.targetPokemon = null;
  state.guess.clues = [];
  state.guess.guesses = [];
  state.guess.attempts = 0;
  state.guess.status = "loading";
  state.guess.message = "Loading a new round...";
  renderGuessMode();

  try {
    const roster = await buildGuessRosterFromSelectedGens();
    if (token !== state.guessRoundToken) return;

    if (!roster.length) {
      state.guess.status = "empty";
      state.guess.message = "Select at least one generation to start GuessDex.";
      renderGuessMode();
      return;
    }

    let targetName = roster[Math.floor(Math.random() * roster.length)];
    if (roster.length > 1 && targetName === state.lastGuessTarget) {
      const alternatives = roster.filter((name) => name !== state.lastGuessTarget);
      targetName =
        alternatives[Math.floor(Math.random() * alternatives.length)] || targetName;
    }
    const targetPokemon = await loadPokemon(targetName);
    if (token !== state.guessRoundToken) return;

    state.guess.targetName = targetName;
    state.guess.targetPokemon = targetPokemon;
    state.guess.clues = buildGuessCluePlan(targetPokemon);
    state.guess.status = "playing";
    state.guess.message = "New round started. Guess the Pokemon.";
    state.lastGuessTarget = targetName;
    if (els.guessInput) {
      els.guessInput.value = "";
    }
    closeGuessSuggestions();
    renderGuessMode();
  } catch (error) {
    console.error(error);
    if (token !== state.guessRoundToken) return;
    state.guess.status = "empty";
    state.guess.message = "Unable to load a round right now. Try again.";
    renderGuessMode();
  }
};

const submitGuess = async () => {
  if (state.activeMode !== "guess") return;
  closeGuessSuggestions();
  if (state.guess.status !== "playing" || !state.guess.targetPokemon) {
    state.guess.message = "Start a round first.";
    renderGuessMode();
    return;
  }

  const rawValue = els.guessInput?.value || "";
  const token = normalizeGuessToken(rawValue);
  if (!token) {
    state.guess.message = "Enter a Pokemon name.";
    renderGuessMode();
    return;
  }

  const canonicalName = state.guessNameLookup.get(token);
  if (!canonicalName) {
    state.guess.message = "That Pokemon is not in the selected generations.";
    renderGuessMode();
    return;
  }

  if (state.guess.guesses.some((entry) => entry.rawName === canonicalName)) {
    state.guess.message = "You already guessed that Pokemon.";
    renderGuessMode();
    return;
  }

  if (els.guessSubmitBtn) {
    els.guessSubmitBtn.disabled = true;
  }

  try {
    const guessedPokemon = await loadPokemon(canonicalName);
    if (state.activeMode !== "guess" || state.guess.status !== "playing") return;

    const feedback = compareGuessPokemon(guessedPokemon, state.guess.targetPokemon);
    state.guess.guesses.push(feedback);
    state.guess.attempts = state.guess.guesses.length;

    if (els.guessInput) {
      els.guessInput.value = "";
    }

    if (feedback.isCorrect) {
      finishGuessRound("won");
      return;
    }

    if (state.guess.attempts >= GUESS_MAX_ATTEMPTS) {
      finishGuessRound("lost");
      return;
    }

    const remaining = GUESS_MAX_ATTEMPTS - state.guess.attempts;
    state.guess.message = `Not quite. ${remaining} guess${remaining === 1 ? "" : "es"} left.`;
    renderGuessMode();
  } catch (error) {
    console.error(error);
    state.guess.message = "Could not load that guess. Try another Pokemon.";
    renderGuessMode();
  } finally {
    if (els.guessSubmitBtn && state.guess.status === "playing") {
      els.guessSubmitBtn.disabled = false;
    }
  }
};

const setMode = async (nextMode) => {
  if (nextMode !== "smash" && nextMode !== "guess") return;
  if (EMBED_LOCK && EMBED_MODE && nextMode !== EMBED_MODE) return;
  const modeChanged = state.activeMode !== nextMode;
  if (nextMode !== "guess") {
    closeGuessSuggestions();
  }
  if (nextMode === "smash") {
    state.guessRoundToken += 1;
  }
  state.activeMode = nextMode;
  saveMode();
  if (state.activeMode === "guess") {
    setPanelOpen(false);
    setMobileHubOpen(false);
    stopCryPlayback();
  }

  syncModeUi();
  updateCounts();

  if (state.activeMode === "guess") {
    if (
      modeChanged ||
      !state.guess.targetPokemon ||
      state.guess.status === "empty"
    ) {
      await startGuessRound();
    } else {
      renderGuessMode();
    }
    return;
  }

  if (modeChanged && !state.current && state.queue.length === 0) {
    await rebuildQueue();
    return;
  }
  updateCounts();
};

const primeQueue = async () => {
  const names = await loadSelectedGenerationRoster();
  if (!names.length) {
    state.queue = [];
    updateCounts();
    return;
  }

  if (els.queueStatus) {
    els.queueStatus.textContent = "Fetching roster...";
  }
  if (els.mobileQueueStatus) {
    els.mobileQueueStatus.textContent = "Fetching roster...";
  }

  let filtered = await filterByTypes(names);
  if (els.onlyMega?.checked) {
    filtered = filtered.filter((name) => MEGA_EVOLUTION_SPECIES.has(name));
  }
  if (els.dailyDeck.checked) {
    const seed = seedFromDate();
    state.queue = seededShuffle(filtered, seed).slice(0, DAILY_SIZE);
  } else {
    state.queue = shuffle(filtered);
  }
  updateCounts();
};

const loadNext = async () => {
  if (state.activeMode !== "smash") return;
  if (state.queue.length === 0) {
    stopCryPlayback();
    state.current = null;
    els.queueStatus.textContent = "Deck empty - pick more generations.";
    if (els.mobileQueueStatus) {
      els.mobileQueueStatus.textContent = "Deck empty - pick more generations.";
    }
    els.name.textContent = "No Pokemon";
    els.bio.textContent = "Choose more generations to keep swiping.";
    els.mainImage.removeAttribute("src");
    els.mainImage.style.removeProperty("--sprite-scale");
    els.types.innerHTML = "";
    if (els.evolutionLine) {
      els.evolutionLine.innerHTML = "";
      els.evolutionLine.hidden = true;
    }
    els.stats.innerHTML = "";
    els.thumbs.innerHTML = "";
    state.currentGallery = [];
    state.currentImage = null;
    updateCryButton();
    return;
  }

  const nextName = state.queue.shift();
  updateCounts();

  try {
    const pokemon = await loadPokemon(nextName);
    state.current = pokemon;
    setCardData(pokemon);
    prefetchUpcoming();
  } catch (error) {
    console.error(error);
    loadNext();
  }
};

const rebuildQueue = async () => {
  if (state.activeMode !== "smash") {
    await startGuessRound();
    return;
  }
  state.queue = [];
  state.current = null;
  updateCounts();
  await primeQueue();
  await loadNext();
};

const shuffleDeck = async () => {
  if (state.activeMode !== "smash") return;
  if (state.isShuffling) return;
  stopCryPlayback();
  state.isShuffling = true;
  els.shuffleBtn.disabled = true;
  els.shuffleBtn.textContent = "Shuffling...";
  if (els.mobileShuffleBtn) {
    els.mobileShuffleBtn.disabled = true;
    els.mobileShuffleBtn.textContent = "Shuffling...";
  }
  els.card.style.transform = "";
  els.card.classList.remove("dragging", "swipe-left", "swipe-right");
  els.card.dataset.status = "";

  if (els.cardShell) {
    els.cardShell.classList.remove("is-shuffling");
    void els.cardShell.offsetWidth;
    els.cardShell.classList.add("is-shuffling");
  }

  await new Promise((resolve) => setTimeout(resolve, 520));

  if (els.cardShell) {
    els.cardShell.classList.remove("is-shuffling");
  }

  try {
    await rebuildQueue();
  } finally {
    state.isShuffling = false;
    els.shuffleBtn.disabled = false;
    els.shuffleBtn.textContent = "Shuffle";
    if (els.mobileShuffleBtn) {
      els.mobileShuffleBtn.disabled = false;
      els.mobileShuffleBtn.textContent = "Shuffle";
    }
  }
};

const registerAction = (type) => {
  if (state.activeMode !== "smash") return;
  if (!state.current) return;

  const historyEntry = {
    name: state.current.name,
    thumb: state.current.thumb || state.current.images.main,
  };

  state.history.push({ pokemon: state.current, direction: type });

  if (type === "smash") {
    state.smashCount += 1;
    state.smashing.push(historyEntry);
    state.smashStreak += 1;
    state.passStreak = 0;
    applySmashStats(state.current, 1);
  } else {
    state.passCount += 1;
    state.passing.push(historyEntry);
    state.passStreak += 1;
    state.smashStreak = 0;
  }

  updateCounts();
  renderHistory(state.smashing, [els.smashList, els.mobileHubSmashList]);
  renderHistory(state.passing, [els.passList, els.mobileHubPassList]);
  renderBadges();
  updateUndoLabel();
  saveHistory();
  showSummaryIfNeeded();
};

const swipe = (direction) => {
  if (state.activeMode !== "smash") return;
  if (!state.current) return;
  stopCryPlayback();

  els.card.dataset.status = direction;
  if (direction === "smash") {
    els.card.classList.add("swipe-right");
  } else {
    els.card.classList.add("swipe-left");
  }

  registerAction(direction);

  setTimeout(() => {
    els.card.classList.remove("swipe-right", "swipe-left");
    els.card.dataset.status = "";
    loadNext();
  }, 320);
};

const undoLast = () => {
  if (state.activeMode !== "smash") return;
  if (!state.history.length) return;

  const last = state.history.pop();
  if (
    state.current?.rawName &&
    last.pokemon.rawName !== state.current.rawName
  ) {
    state.queue.unshift(state.current.rawName);
  }

  if (last.direction === "smash") {
    state.smashCount = Math.max(0, state.smashCount - 1);
    state.smashing.pop();
    applySmashStats(last.pokemon, -1);
  } else {
    state.passCount = Math.max(0, state.passCount - 1);
    state.passing.pop();
  }

  recomputeStreaks();
  state.current = last.pokemon;
  setCardData(state.current);
  updateCounts();
  renderHistory(state.smashing, [els.smashList, els.mobileHubSmashList]);
  renderHistory(state.passing, [els.passList, els.mobileHubPassList]);
  renderBadges();
  updateUndoLabel();
  saveHistory();
};

const clearHistory = () => {
  if (state.activeMode !== "smash") return;
  state.smashing = [];
  state.passing = [];
  state.history = [];
  state.smashCount = 0;
  state.passCount = 0;
  state.smashStreak = 0;
  state.passStreak = 0;
  state.smashTypeCounts = new Map();
  state.smashStatTotals = {};
  updateCounts();
  renderHistory(state.smashing, [els.smashList, els.mobileHubSmashList]);
  renderHistory(state.passing, [els.passList, els.mobileHubPassList]);
  renderBadges();
  updateUndoLabel();
  saveHistory();
};

const handlePointerDown = (event) => {
  if (state.activeMode !== "smash") return;
  if (
    event.target.closest("button, input, label") ||
    event.target === els.mainImage
  ) {
    return;
  }
  state.isDragging = false;
  state.dragCandidate = true;
  state.dragStart = event.clientX;
  state.dragStartY = event.clientY;
  state.dragStartTime = performance.now();
  state.dragPointerId = event.pointerId;
  state.dragX = 0;
  state.suppressImageClick = false;
  els.card.classList.add("dragging");
};

const handlePointerMove = (event) => {
  if (state.activeMode !== "smash") return;
  if (!state.dragCandidate) return;
  const deltaX = event.clientX - state.dragStart;
  const deltaY = event.clientY - state.dragStartY;

  if (!state.isDragging) {
    const horizontal =
      Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY);
    const vertical =
      Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX);
    if (!horizontal && vertical) {
      if (isMobileView() && deltaY < 0) {
        state.suppressImageClick = true;
        return;
      }
      state.dragCandidate = false;
      els.card.classList.remove("dragging");
      return;
    }
    if (!horizontal) return;
    state.isDragging = true;
    els.card.setPointerCapture(event.pointerId);
  }

  state.dragX = deltaX;
  state.suppressImageClick = true;
  const rotation = deltaX / 15;
  els.card.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;

  if (deltaX > 80) {
    els.card.dataset.status = "smash";
  } else if (deltaX < -80) {
    els.card.dataset.status = "pass";
  } else {
    els.card.dataset.status = "";
  }
};

const handlePointerUp = (event) => {
  if (state.activeMode !== "smash") return;
  if (!state.dragCandidate) return;
  const deltaX = event.clientX - state.dragStart;
  const deltaY = event.clientY - state.dragStartY;
  const elapsed = performance.now() - state.dragStartTime;
  const velocity = deltaX / Math.max(elapsed, 1);
  const upwardVelocity = -deltaY / Math.max(elapsed, 1);
  const shouldSwipeRight = deltaX > 120 || velocity > 0.6;
  const shouldSwipeLeft = deltaX < -120 || velocity < -0.6;
  const shouldShuffleUp =
    isMobileView() &&
    !state.isShuffling &&
    Math.abs(deltaX) < SHUFFLE_SWIPE_MAX_HORIZONTAL_DRIFT &&
    deltaY < -SHUFFLE_SWIPE_MIN_DISTANCE &&
    upwardVelocity > SHUFFLE_SWIPE_MIN_VELOCITY;

  state.isDragging = false;
  state.dragCandidate = false;
  els.card.classList.remove("dragging");
  if (
    state.dragPointerId !== null &&
    els.card.hasPointerCapture(state.dragPointerId)
  ) {
    els.card.releasePointerCapture(state.dragPointerId);
  }
  els.card.style.transform = "";

  if (shouldSwipeRight) {
    swipe("smash");
  } else if (shouldSwipeLeft) {
    swipe("pass");
  } else if (shouldShuffleUp) {
    shuffleDeck();
  } else {
    els.card.dataset.status = "";
  }
  state.dragX = 0;
  state.dragPointerId = null;
};

const handlePointerCancel = () => {
  if (state.activeMode !== "smash") return;
  if (!state.dragCandidate) return;
  state.isDragging = false;
  state.dragCandidate = false;
  els.card.classList.remove("dragging");
  if (
    state.dragPointerId !== null &&
    els.card.hasPointerCapture(state.dragPointerId)
  ) {
    els.card.releasePointerCapture(state.dragPointerId);
  }
  els.card.style.transform = "";
  els.card.dataset.status = "";
  state.dragX = 0;
  state.dragPointerId = null;
};

const cycleImage = (direction) => {
  if (state.activeMode !== "smash") return;
  if (!state.current || !state.currentGallery.length) return;
  const gallery = state.currentGallery;
  const currentIndex = gallery.indexOf(state.currentImage);
  if (currentIndex === -1) {
    setMainImage(gallery[0]);
    return;
  }
  const nextIndex =
    direction === "prev"
      ? (currentIndex - 1 + gallery.length) % gallery.length
      : (currentIndex + 1) % gallery.length;
  setMainImage(gallery[nextIndex]);
};

const handleImagePointerDown = (event) => {
  if (state.activeMode !== "smash") return;
  state.imageSwipeStartX = event.clientX;
  state.imageSwipeStartY = event.clientY;
  state.imageSwipePointerId = event.pointerId;
  state.imageSwipeActive = true;
  state.suppressImageClick = false;
  els.mainImage.setPointerCapture(event.pointerId);
  event.stopPropagation();
};

const handleImagePointerMove = (event) => {
  if (state.activeMode !== "smash") return;
  if (!state.imageSwipeActive) return;
  const deltaX = event.clientX - state.imageSwipeStartX;
  const deltaY = event.clientY - state.imageSwipeStartY;
  if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
    state.suppressImageClick = true;
  }
};

const handleImagePointerUp = (event) => {
  if (state.activeMode !== "smash") return;
  if (!state.imageSwipeActive) return;
  const deltaX = event.clientX - state.imageSwipeStartX;
  const deltaY = event.clientY - state.imageSwipeStartY;
  if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
    cycleImage(deltaX > 0 ? "prev" : "next");
  }
  state.imageSwipeActive = false;
  if (
    state.imageSwipePointerId !== null &&
    els.mainImage.hasPointerCapture(state.imageSwipePointerId)
  ) {
    els.mainImage.releasePointerCapture(state.imageSwipePointerId);
  }
  state.imageSwipePointerId = null;
  event.stopPropagation();
};

const handleAbilityTabClick = (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const tab = target.closest(".ability-chip[data-ability-tab]");
  if (!tab || !els.stats.contains(tab)) return;

  const block = tab.closest(".abilities-block");
  if (!block) return;
  const nextIndex = tab.dataset.abilityTab;

  const tabs = block.querySelectorAll(".ability-chip[data-ability-tab]");
  tabs.forEach((item) => {
    const isActive = item.dataset.abilityTab === nextIndex;
    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-selected", String(isActive));
  });

  const panels = block.querySelectorAll(".ability-panel[data-ability-panel]");
  panels.forEach((panel) => {
    const isActive = panel.dataset.abilityPanel === nextIndex;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });
};

const setupEvents = () => {
  if (els.modeSmashBtn) {
    els.modeSmashBtn.addEventListener("click", () => {
      setMode("smash");
    });
  }
  if (els.modeGuessBtn) {
    els.modeGuessBtn.addEventListener("click", () => {
      setMode("guess");
    });
  }

  if (els.guessForm) {
    els.guessForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitGuess();
    });
  }
  if (els.guessInput) {
    els.guessInput.addEventListener("input", () => {
      updateGuessSuggestions({ preserveActive: false });
    });
    els.guessInput.addEventListener("focus", () => {
      updateGuessSuggestions({ preserveActive: false });
    });
    els.guessInput.addEventListener("blur", () => {
      window.setTimeout(() => {
        const active = document.activeElement;
        if (active instanceof Element && els.guessSuggestions?.contains(active)) {
          return;
        }
        closeGuessSuggestions();
      }, 80);
    });
    els.guessInput.addEventListener("keydown", handleGuessInputKeydown);
  }
  if (els.guessSuggestionsList) {
    els.guessSuggestionsList.addEventListener(
      "click",
      handleGuessSuggestionClick,
    );
  }

  if (els.guessNextBtn) {
    els.guessNextBtn.addEventListener("click", () => {
      startGuessRound();
    });
  }

  els.passBtn.addEventListener("click", () => swipe("pass"));
  els.smashBtn.addEventListener("click", () => swipe("smash"));
  els.undoBtn.addEventListener("click", undoLast);
  els.shuffleBtn.addEventListener("click", shuffleDeck);
  els.clearHistory.addEventListener("click", clearHistory);
  els.favoriteBtn.addEventListener("click", toggleFavorite);
  els.cryBtn.addEventListener("click", () => {
    playCry();
  });
  els.exportJson.addEventListener("click", () => exportFavorites("json"));
  els.exportCsv.addEventListener("click", () => exportFavorites("csv"));
  els.shareCard.addEventListener("click", shareMatchCard);
  els.helpBtn.addEventListener("click", () => toggleModal(els.helpModal, true));
  els.helpClose.addEventListener("click", () =>
    toggleModal(els.helpModal, false),
  );
  els.summaryClose.addEventListener("click", () =>
    toggleModal(els.summaryModal, false),
  );
  els.summaryModal.addEventListener("click", (event) => {
    if (event.target === els.summaryModal) toggleModal(els.summaryModal, false);
  });
  els.helpModal.addEventListener("click", (event) => {
    if (event.target === els.helpModal) toggleModal(els.helpModal, false);
  });
  els.peekBtn.addEventListener("click", () => {
    const nowShowing = !els.card.classList.contains("show-stats");
    els.card.classList.toggle("show-stats", nowShowing);
    updatePeekButton(nowShowing);
    if (!nowShowing) {
      els.autoReveal.checked = false;
    }
    saveOptions();
  });
  els.selectAll.addEventListener("click", () => {
    state.selectedGens = new Set(
      Array.from({ length: GEN_COUNT }, (_, i) => i + 1),
    );
    buildGenFilters();
    saveFilters();
    updateMobileFilterBar();
    if (state.activeMode === "guess") {
      startGuessRound();
    } else {
      rebuildQueue();
    }
  });
  els.clearAll.addEventListener("click", () => {
    state.selectedGens.clear();
    buildGenFilters();
    saveFilters();
    updateMobileFilterBar();
    if (state.activeMode === "guess") {
      startGuessRound();
    } else {
      rebuildQueue();
    }
  });
  els.typeAll.addEventListener("click", () => {
    state.selectedTypes = new Set(TYPE_LIST);
    buildTypeFilters();
    saveFilters();
    updateMobileFilterBar();
    if (state.activeMode === "smash") {
      rebuildQueue();
    }
  });
  els.typeClear.addEventListener("click", () => {
    state.selectedTypes.clear();
    buildTypeFilters();
    saveFilters();
    updateMobileFilterBar();
    if (state.activeMode === "smash") {
      rebuildQueue();
    }
  });
  els.autoReveal.addEventListener("change", () => {
    if (state.activeMode !== "smash") return;
    const showStats = els.autoReveal.checked;
    els.card.classList.toggle("show-stats", showStats);
    updatePeekButton(showStats);
    saveOptions();
    updateMobileFilterBar();
  });
  els.shinyMode.addEventListener("change", () => {
    if (state.activeMode !== "smash") return;
    if (state.current) {
      setCardData(state.current);
    }
    saveOptions();
    updateMobileFilterBar();
  });
  els.dailyDeck.addEventListener("change", () => {
    saveOptions();
    updateMobileFilterBar();
    if (state.activeMode === "smash") {
      rebuildQueue();
    }
  });
  els.onlyMega.addEventListener("change", () => {
    saveOptions();
    if (state.activeMode === "smash") {
      rebuildQueue();
    }
  });
  els.keepHistory.addEventListener("change", () => {
    if (state.activeMode !== "smash") return;
    renderHistory(state.smashing, [els.smashList, els.mobileHubSmashList]);
    renderHistory(state.passing, [els.passList, els.mobileHubPassList]);
    saveOptions();
  });
  els.stats.addEventListener("click", handleAbilityTabClick);

  els.card.addEventListener("pointerdown", handlePointerDown);
  els.card.addEventListener("pointermove", handlePointerMove);
  els.card.addEventListener("pointerup", handlePointerUp);
  els.card.addEventListener("pointercancel", handlePointerCancel);

  document.addEventListener("keydown", (event) => {
    if (state.activeMode === "smash" && event.key === "ArrowLeft") {
      swipe("pass");
    }
    if (state.activeMode === "smash" && event.key === "ArrowRight") {
      swipe("smash");
    }
    if (
      state.activeMode === "smash" &&
      event.key.toLowerCase() === "z" &&
      (event.metaKey || event.ctrlKey)
    ) {
      undoLast();
    }
    if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
      toggleModal(els.helpModal, true);
    }
    if (event.key === "Escape") {
      toggleModal(els.helpModal, false);
      toggleModal(els.summaryModal, false);
      setPanelOpen(false);
      setMobileHubOpen(false);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!state.mobileHubOpen || !els.mobileHub || !els.mobileHubToggle) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (els.mobileHub.contains(target) || els.mobileHubToggle.contains(target))
      return;
    setMobileHubOpen(false);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!state.guessSuggestionsOpen || !els.guessForm) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (els.guessForm.contains(target)) return;
    closeGuessSuggestions();
  });

  els.mainImage.addEventListener("click", () => {
    if (state.suppressImageClick) {
      state.suppressImageClick = false;
      return;
    }
    cycleImage("next");
  });

  els.mainImage.addEventListener("pointerdown", handleImagePointerDown);
  els.mainImage.addEventListener("pointermove", handleImagePointerMove);
  els.mainImage.addEventListener("pointerup", handleImagePointerUp);
  els.mainImage.addEventListener("pointercancel", handleImagePointerUp);

  if (els.mobileDaily) {
    els.mobileDaily.addEventListener("click", () => {
      els.dailyDeck.checked = !els.dailyDeck.checked;
      els.dailyDeck.dispatchEvent(new Event("change"));
    });
  }

  if (els.mobileShiny) {
    els.mobileShiny.addEventListener("click", () => {
      els.shinyMode.checked = !els.shinyMode.checked;
      els.shinyMode.dispatchEvent(new Event("change"));
    });
  }

  if (els.mobileFilters) {
    els.mobileFilters.addEventListener("click", () => {
      setPanelOpen(true);
      setMobileHubOpen(false);
    });
  }

  if (els.mobileHubToggle) {
    els.mobileHubToggle.addEventListener("click", () => {
      if (state.activeMode !== "smash") return;
      setPanelOpen(false);
      setMobileHubOpen(!state.mobileHubOpen);
    });
  }

  if (els.mobileHubClose) {
    els.mobileHubClose.addEventListener("click", () => setMobileHubOpen(false));
  }

  if (els.mobileHubSmashToggle) {
    els.mobileHubSmashToggle.addEventListener("click", () => {
      const next =
        els.mobileHubSmashToggle.getAttribute("aria-expanded") !== "true";
      setMobileHistoryPanelOpen("smash", next);
      if (next) setMobileHistoryPanelOpen("pass", false);
    });
  }

  if (els.mobileHubPassToggle) {
    els.mobileHubPassToggle.addEventListener("click", () => {
      const next =
        els.mobileHubPassToggle.getAttribute("aria-expanded") !== "true";
      setMobileHistoryPanelOpen("pass", next);
      if (next) setMobileHistoryPanelOpen("smash", false);
    });
  }

  if (els.mobilePassBtn) {
    els.mobilePassBtn.addEventListener("click", () => {
      swipe("pass");
      setMobileHubOpen(false);
    });
  }

  if (els.mobileSmashBtn) {
    els.mobileSmashBtn.addEventListener("click", () => {
      swipe("smash");
      setMobileHubOpen(false);
    });
  }

  if (els.mobileUndoBtn) {
    els.mobileUndoBtn.addEventListener("click", () => {
      undoLast();
      setMobileHubOpen(false);
    });
  }

  if (els.mobileShuffleBtn) {
    els.mobileShuffleBtn.addEventListener("click", () => {
      shuffleDeck();
      setMobileHubOpen(false);
    });
  }

  if (els.mobileHubHelp) {
    els.mobileHubHelp.addEventListener("click", () => {
      toggleModal(els.helpModal, true);
      setMobileHubOpen(false);
    });
  }

  if (els.mobileHubFilters) {
    els.mobileHubFilters.addEventListener("click", () => {
      setPanelOpen(true);
      setMobileHubOpen(false);
    });
  }

  if (els.panelClose) {
    els.panelClose.addEventListener("click", () => setPanelOpen(false));
  }

  if (els.panelOverlay) {
    els.panelOverlay.addEventListener("click", () => setPanelOpen(false));
  }
};

const init = async () => {
  if (EMBED_LOCK) {
    document.body.classList.add("embed-mode");
  }
  const filtersLoaded = loadFilters();
  if (!filtersLoaded && state.selectedTypes.size === 0) {
    state.selectedTypes = new Set(TYPE_LIST);
  }
  loadMode();
  loadHistory();
  loadOptions();
  loadFavorites();
  loadGuessStats();
  buildGenFilters();
  buildTypeFilters();
  updateMobileFilterBar();
  setupEvents();
  syncModeUi();
  updateCounts();
  renderHistory(state.smashing, [els.smashList, els.mobileHubSmashList]);
  renderHistory(state.passing, [els.passList, els.mobileHubPassList]);
  renderFavorites();
  renderBadges();
  renderGuessMode();
  updateUndoLabel();
  updateCryButton();
  if (els.autoReveal.checked) {
    els.card.classList.add("show-stats");
    updatePeekButton(true);
  }
  if (state.activeMode === "guess") {
    await startGuessRound();
  } else {
    await rebuildQueue();
  }
};

const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost")
    return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
};

registerServiceWorker();
init();
