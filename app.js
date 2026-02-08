const POKEAPI = "https://pokeapi.co/api/v2";
const GEN_COUNT = 9;
const STORAGE_KEY = "smashdex_history";
const FILTER_KEY = "smashdex_filters";
const OPTIONS_KEY = "smashdex_options";
const FAV_KEY = "smashdex_favorites";
const SUMMARY_INTERVAL = 20;
const DAILY_SIZE = 20;
const PRELOAD_COUNT = 2;
const MOBILE_VIEW_QUERY = "(max-width: 980px)";
const SHUFFLE_SWIPE_MIN_DISTANCE = 120;
const SHUFFLE_SWIPE_MAX_HORIZONTAL_DRIFT = 72;
const SHUFFLE_SWIPE_MIN_VELOCITY = 0.45;

const els = {
  cardShell: document.getElementById("cardShell"),
  card: document.getElementById("card"),
  mainImage: document.getElementById("mainImage"),
  thumbs: document.getElementById("thumbs"),
  name: document.getElementById("pokeName"),
  id: document.getElementById("pokeId"),
  types: document.getElementById("typeBadges"),
  bio: document.getElementById("bio"),
  stats: document.getElementById("stats"),
  passBtn: document.getElementById("passBtn"),
  smashBtn: document.getElementById("smashBtn"),
  undoBtn: document.getElementById("undoBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  peekBtn: document.getElementById("peekBtn"),
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
  mobileHubSmashList: document.getElementById("mobileHubSmashList"),
  mobileHubPassList: document.getElementById("mobileHubPassList"),
  summaryModal: document.getElementById("summaryModal"),
  summaryContent: document.getElementById("summaryContent"),
  summaryClose: document.getElementById("summaryClose"),
  helpModal: document.getElementById("helpModal"),
  helpClose: document.getElementById("helpClose"),
  queueStatus: document.getElementById("queueStatus"),
  smashCount: document.getElementById("smashCount"),
  passCount: document.getElementById("passCount"),
  genLabel: document.getElementById("pokeGen"),
  panel: document.getElementById("filterPanel"),
  panelOverlay: document.getElementById("panelOverlay"),
  panelClose: document.getElementById("panelClose"),
  mobileDaily: document.getElementById("mobileDaily"),
  mobileShiny: document.getElementById("mobileShiny"),
  mobileFilters: document.getElementById("mobileFilters"),
  filterCounts: document.getElementById("filterCounts"),
};

const state = {
  selectedGens: new Set(Array.from({ length: GEN_COUNT }, (_, i) => i + 1)),
  selectedTypes: new Set(),
  queue: [],
  current: null,
  currentImage: null,
  currentGallery: [],
  cache: new Map(),
  typeIndex: new Map(),
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
  isShuffling: false,
  mobileHubOpen: false,
};

const typeColors = {
  normal: "#f4d06f",
  fire: "#ff6b2d",
  water: "#62c6ff",
  electric: "#ffe066",
  grass: "#72e6a1",
  ice: "#b0f4ff",
  fighting: "#ff8a65",
  poison: "#d09cff",
  ground: "#f1b46e",
  flying: "#c4d4ff",
  psychic: "#ff9ad5",
  bug: "#cfe36a",
  rock: "#d6c7a0",
  ghost: "#9aa0ff",
  dragon: "#7ab6ff",
  dark: "#a5a0a0",
  steel: "#cad7df",
  fairy: "#ffb3d6",
};

const typeIconFiles = {
  normal: "Normal_icon_PE.png",
  fire: "Fire_icon_PE.png",
  water: "Water_icon_PE.png",
  electric: "Electric_icon_PE.png",
  grass: "Grass_icon_PE.png",
  ice: "Ice_icon_PE.png",
  fighting: "Fighting_icon_PE.png",
  poison: "Poison_icon_PE.png",
  ground: "Ground_icon_PE.png",
  flying: "Flying_icon_PE.png",
  psychic: "Psychic_icon_PE.png",
  bug: "Bug_icon_PE.png",
  rock: "Rock_icon_PE.png",
  ghost: "Ghost_icon_PE.png",
  dragon: "Dragon_icon_PE.png",
  dark: "Dark_icon_PE.png",
  steel: "Steel_icon_PE.png",
  fairy: "Fairy_icon_PE.png",
};

const getTypeIconUrl = (type) => {
  const file = typeIconFiles[type];
  if (!file) return "";
  return `https://archives.bulbagarden.net/wiki/Special:FilePath/${encodeURIComponent(file)}`;
};

const TYPE_LIST = Object.keys(typeColors);
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
              : { name: entry.name || "Unknown", thumb: entry.thumb || "" }
          )
        : [];
    state.smashing = normalizeList(data.smash);
    state.passing = normalizeList(data.pass);
    state.smashCount = Number(data.smashCount) || state.smashing.length;
    state.passCount = Number(data.passCount) || state.passing.length;
    if (data.typeCounts && typeof data.typeCounts === "object") {
      state.smashTypeCounts = new Map(
        Object.entries(data.typeCounts).map(([key, value]) => [key, Number(value) || 0])
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
        data.gens.filter((gen) => Number.isInteger(gen) && gen >= 1 && gen <= GEN_COUNT)
      );
    }
    if (Array.isArray(data.types)) {
      state.selectedTypes = new Set(
        data.types.filter((type) => typeof type === "string" && TYPE_LIST.includes(type))
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
          typeof entry === "string" ? { name: entry, thumb: "" } : entry
        )
        .filter((entry) => entry && entry.name);
    }
  } catch {
    // Ignore storage errors
  }
};

const buildGenFilters = () => {
  els.genGrid.innerHTML = "";
  for (let i = 1; i <= GEN_COUNT; i += 1) {
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
      saveFilters();
      updateMobileFilterBar();
      rebuildQueue();
    });
    label.appendChild(checkbox);
    label.append(`Gen ${i}`);
    els.genGrid.appendChild(label);
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
      rebuildQueue();
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
  els.smashCount.textContent = String(state.smashCount);
  els.passCount.textContent = String(state.passCount);
  const label = els.dailyDeck.checked ? "Daily deck" : "Deck";
  const queueText = `${label}: ${state.queue.length} left`;
  els.queueStatus.textContent = queueText;
  if (els.mobileQueueStatus) {
    els.mobileQueueStatus.textContent = queueText;
  }
  if (els.mobileScoreStatus) {
    els.mobileScoreStatus.textContent = `Smash ${state.smashCount} - Pass ${state.passCount}`;
  }
};

const renderHistory = (items, containers) => {
  const targets = (Array.isArray(containers) ? containers : [containers]).filter(Boolean);
  targets.forEach((container) => {
    container.innerHTML = "";
  });
  if (!els.keepHistory.checked) {
    return;
  }
  items.slice(-12).forEach((entry) => {
    targets.forEach((container) => {
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
      container.appendChild(chip);
    });
  });
};

const chooseFlavorText = (entries) => {
  const english = entries.filter((entry) => entry.language.name === "en");
  const unique = Array.from(
    new Set(english.map((entry) => entry.flavor_text.replace(/\s+/g, " ").trim()))
  );
  return unique[0] || "No flavor text yet.";
};

const formatStats = (stats) => {
  const total = stats.reduce((sum, stat) => sum + stat.base_stat, 0);
  const rows = stats.map(
    (stat) => `<div class="stat"><span>${capitalize(stat.stat.name)}</span><span>${stat.base_stat}</span></div>`
  );
  rows.push(`<div class="stat stat-total"><span>Total</span><span>${total}</span></div>`);
  return rows.join("");
};

const formatVitals = (pokemon) => {
  const generation = getGenerationFromId(pokemon.id);
  const heightMeters = Number.isFinite(pokemon.height) ? (pokemon.height / 10).toFixed(1) : "?";
  const weightKg = Number.isFinite(pokemon.weight) ? (pokemon.weight / 10).toFixed(1) : "?";
  const vitals = [
    { label: "Generation", value: generation ? `Gen ${generation}` : "Unknown" },
    { label: "Height", value: `${heightMeters} m` },
    { label: "Weight", value: `${weightKg} kg` },
  ];

  return `<div class="stat-vitals">${vitals
    .map(
      (item) =>
        `<div class="vital-chip"><span class="vital-key">${item.label}</span><span class="vital-value">${item.value}</span></div>`
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

const renderTypes = (types, canMega = false) => {
  els.types.innerHTML = "";
  types.forEach((type) => {
    const badge = document.createElement("span");
    badge.className = "type";
    badge.textContent = type.type.name;
    badge.style.background = typeColors[type.type.name] || "#f0f0f0";
    els.types.appendChild(badge);
  });

  if (canMega) {
    const megaBadge = document.createElement("span");
    megaBadge.className = "type type-mega";
    megaBadge.setAttribute("aria-label", "Can Mega Evolve");
    megaBadge.title = "Can Mega Evolve";
    megaBadge.innerHTML =
      '<span class="mega-icon" aria-hidden="true"><svg viewBox="0 0 20 20" focusable="false"><path d="M10 1.8L13.2 4l4-.5-.5 4L18.2 10l-1.5 2.5.5 4-4-.5L10 18.2 6.8 16l-4 .5.5-4L1.8 10l1.5-2.5-.5-4 4 .5L10 1.8zm-.1 4.4L7.2 10h2.1L8.2 14l4.6-4.8h-2.1l1.2-3z"/></svg></span>';
    els.types.appendChild(megaBadge);
  }
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
  els.name.textContent = pokemon.name;
  els.id.textContent = `#${String(pokemon.id).padStart(4, "0")}`;
  if (els.genLabel) {
    const gen = getGenerationFromId(pokemon.id);
    els.genLabel.textContent = gen ? `Gen ${gen}` : "Gen ?";
  }
  els.bio.textContent = pokemon.bio;
  els.stats.innerHTML = `${formatVitals(pokemon)}${formatStats(pokemon.stats)}`;
  renderTypes(pokemon.types, pokemon.canMegaEvolve);
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
  els.peekBtn.textContent = showStats ? "Hide stats" : "Peek stats";
  updateFavoriteButton();
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

  const main = other["official-artwork"]?.front_default || other.home?.front_default || sprites.front_default;
  const shiny = sprites.front_shiny || other.home?.front_shiny || main;

  return {
    main,
    shiny,
    gallery: Array.from(new Set(gallery)).slice(0, 6),
  };
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
    Array.from(state.selectedTypes.values()).map((type) => loadTypeIndex(type))
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

  const pokemon = {
    id: details.id,
    rawName: details.name,
    name: capitalize(details.name),
    height: details.height,
    weight: details.weight,
    canMegaEvolve: MEGA_EVOLUTION_SPECIES.has(details.species?.name || details.name),
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
    exists ? "Remove from saved Pokemon" : "Save Pokemon"
  );
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

const setMobileHubOpen = (open) => {
  if (!els.mobileHub || !els.mobileHubToggle) return;
  state.mobileHubOpen = open;
  els.mobileHub.classList.toggle("is-open", open);
  els.mobileHub.setAttribute("aria-hidden", open ? "false" : "true");
  els.mobileHubToggle.setAttribute("aria-expanded", open ? "true" : "false");
  document.body.classList.toggle("mobile-hub-open", open);
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
    (fav) => fav.name === state.current.name
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
    downloadFile("smashdex-favorites.json", JSON.stringify(state.favorites, null, 2), "application/json");
    return;
  }
  const header = "name";
  const rows = state.favorites.map((fav) => `"${fav.name.replace(/\"/g, "\"\"")}"`);
  downloadFile("smashdex-favorites.csv", [header, ...rows].join("\n"), "text/csv");
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

  const items = (state.favorites.length ? state.favorites : state.smashing).slice(0, 8);
  const startX = 40;
  const startY = 150;
  const gap = 110;
  const rowGap = 150;

  const images = await Promise.all(
    items.map((item) => loadImage(item.thumb))
  );

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
    (a, b) => b[1] - a[1]
  );
  if (typeEntries[0]?.[1] >= 6) {
    badges.push(`${capitalize(typeEntries[0][0])} Loyalist`);
  }

  const totals = state.smashStatTotals;
  if (state.smashCount > 0) {
    const avgSpeed = Math.round((totals.speed || 0) / state.smashCount);
    const avgAtk = Math.round((totals.attack || 0) / state.smashCount);
    const avgSpAtk = Math.round((totals["special-attack"] || 0) / state.smashCount);
    const avgDef = Math.round((totals.defense || 0) / state.smashCount);
    const avgSpDef = Math.round((totals["special-defense"] || 0) / state.smashCount);

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
    (a, b) => b[1] - a[1]
  );
  const topTypes = typeEntries.slice(0, 3).map(([type, count]) => ({
    type: capitalize(type),
    count,
  }));

  const totals = state.smashStatTotals;
  const avgStats = ["attack", "defense", "special-attack", "special-defense", "speed"]
    .map((key) => ({
      label: capitalize(key.replace("-", " ")),
      value: state.smashCount ? Math.round((totals[key] || 0) / state.smashCount) : 0,
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
    <div><strong>Top types:</strong> ${summary.topTypes
      .map((entry) => `${entry.type} (${entry.count})`)
      .join(", ") || "None yet"}</div>
    <div><strong>Avg stats:</strong> ${summary.avgStats
      .map((stat) => `${stat.label} ${stat.value}`)
      .join(" · ")}</div>
  `;
  toggleModal(els.summaryModal, true);
};

const primeQueue = async () => {
  const genIds = Array.from(state.selectedGens.values());
  if (!genIds.length) {
    state.queue = [];
    updateCounts();
    return;
  }

  els.queueStatus.textContent = "Fetching roster...";
  if (els.mobileQueueStatus) {
    els.mobileQueueStatus.textContent = "Fetching roster...";
  }

  const gens = await Promise.all(
    genIds.map((id) => fetchJson(`${POKEAPI}/generation/${id}`))
  );

  const names = gens.flatMap((gen) => gen.pokemon_species.map((entry) => entry.name));
  const filtered = await filterByTypes(names);
  if (els.dailyDeck.checked) {
    const seed = seedFromDate();
    state.queue = seededShuffle(filtered, seed).slice(0, DAILY_SIZE);
  } else {
    state.queue = shuffle(filtered);
  }
  updateCounts();
};

const loadNext = async () => {
  if (state.queue.length === 0) {
    els.queueStatus.textContent = "Deck empty - pick more generations.";
    if (els.mobileQueueStatus) {
      els.mobileQueueStatus.textContent = "Deck empty - pick more generations.";
    }
    els.name.textContent = "No Pokemon";
    els.bio.textContent = "Choose more generations to keep swiping.";
    els.mainImage.removeAttribute("src");
    els.mainImage.style.removeProperty("--sprite-scale");
    els.types.innerHTML = "";
    els.stats.innerHTML = "";
    els.thumbs.innerHTML = "";
    state.currentGallery = [];
    state.currentImage = null;
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
  state.queue = [];
  state.current = null;
  updateCounts();
  await primeQueue();
  await loadNext();
};

const shuffleDeck = async () => {
  if (state.isShuffling) return;
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
  if (!state.current) return;

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
  if (!state.history.length) return;

  const last = state.history.pop();
  if (state.current?.rawName && last.pokemon.rawName !== state.current.rawName) {
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
  if (event.target.closest("button, input, label") || event.target === els.mainImage) {
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
  if (!state.dragCandidate) return;
  const deltaX = event.clientX - state.dragStart;
  const deltaY = event.clientY - state.dragStartY;

  if (!state.isDragging) {
    const horizontal = Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY);
    const vertical = Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX);
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
  if (!state.dragCandidate) return;
  const deltaX = event.clientX - state.dragStart;
  const deltaY = event.clientY - state.dragStartY;
  const elapsed = performance.now() - state.dragStartTime;
  const velocity = deltaX / Math.max(elapsed, 1);
  const upwardVelocity = (-deltaY) / Math.max(elapsed, 1);
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
  if (state.dragPointerId !== null && els.card.hasPointerCapture(state.dragPointerId)) {
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
  if (!state.dragCandidate) return;
  state.isDragging = false;
  state.dragCandidate = false;
  els.card.classList.remove("dragging");
  if (state.dragPointerId !== null && els.card.hasPointerCapture(state.dragPointerId)) {
    els.card.releasePointerCapture(state.dragPointerId);
  }
  els.card.style.transform = "";
  els.card.dataset.status = "";
  state.dragX = 0;
  state.dragPointerId = null;
};

const cycleImage = (direction) => {
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
  state.imageSwipeStartX = event.clientX;
  state.imageSwipeStartY = event.clientY;
  state.imageSwipePointerId = event.pointerId;
  state.imageSwipeActive = true;
  state.suppressImageClick = false;
  els.mainImage.setPointerCapture(event.pointerId);
  event.stopPropagation();
};

const handleImagePointerMove = (event) => {
  if (!state.imageSwipeActive) return;
  const deltaX = event.clientX - state.imageSwipeStartX;
  const deltaY = event.clientY - state.imageSwipeStartY;
  if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
    state.suppressImageClick = true;
  }
};

const handleImagePointerUp = (event) => {
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

const setupEvents = () => {
  els.passBtn.addEventListener("click", () => swipe("pass"));
  els.smashBtn.addEventListener("click", () => swipe("smash"));
  els.undoBtn.addEventListener("click", undoLast);
  els.shuffleBtn.addEventListener("click", shuffleDeck);
  els.clearHistory.addEventListener("click", clearHistory);
  els.favoriteBtn.addEventListener("click", toggleFavorite);
  els.exportJson.addEventListener("click", () => exportFavorites("json"));
  els.exportCsv.addEventListener("click", () => exportFavorites("csv"));
  els.shareCard.addEventListener("click", shareMatchCard);
  els.helpBtn.addEventListener("click", () => toggleModal(els.helpModal, true));
  els.helpClose.addEventListener("click", () => toggleModal(els.helpModal, false));
  els.summaryClose.addEventListener("click", () => toggleModal(els.summaryModal, false));
  els.summaryModal.addEventListener("click", (event) => {
    if (event.target === els.summaryModal) toggleModal(els.summaryModal, false);
  });
  els.helpModal.addEventListener("click", (event) => {
    if (event.target === els.helpModal) toggleModal(els.helpModal, false);
  });
  els.peekBtn.addEventListener("click", () => {
    const nowShowing = !els.card.classList.contains("show-stats");
    els.card.classList.toggle("show-stats", nowShowing);
    els.peekBtn.textContent = nowShowing ? "Hide stats" : "Peek stats";
    if (!nowShowing) {
      els.autoReveal.checked = false;
    }
    saveOptions();
  });
  els.selectAll.addEventListener("click", () => {
    state.selectedGens = new Set(Array.from({ length: GEN_COUNT }, (_, i) => i + 1));
    buildGenFilters();
    saveFilters();
    updateMobileFilterBar();
    rebuildQueue();
  });
  els.clearAll.addEventListener("click", () => {
    state.selectedGens.clear();
    buildGenFilters();
    saveFilters();
    updateMobileFilterBar();
    rebuildQueue();
  });
  els.typeAll.addEventListener("click", () => {
    state.selectedTypes = new Set(TYPE_LIST);
    buildTypeFilters();
    saveFilters();
    updateMobileFilterBar();
    rebuildQueue();
  });
  els.typeClear.addEventListener("click", () => {
    state.selectedTypes.clear();
    buildTypeFilters();
    saveFilters();
    updateMobileFilterBar();
    rebuildQueue();
  });
  els.autoReveal.addEventListener("change", () => {
    const showStats = els.autoReveal.checked;
    els.card.classList.toggle("show-stats", showStats);
    els.peekBtn.textContent = showStats ? "Hide stats" : "Peek stats";
    saveOptions();
    updateMobileFilterBar();
  });
  els.shinyMode.addEventListener("change", () => {
    if (state.current) {
      setCardData(state.current);
    }
    saveOptions();
    updateMobileFilterBar();
  });
  els.dailyDeck.addEventListener("change", () => {
    saveOptions();
    updateMobileFilterBar();
    rebuildQueue();
  });
  els.keepHistory.addEventListener("change", () => {
    renderHistory(state.smashing, [els.smashList, els.mobileHubSmashList]);
    renderHistory(state.passing, [els.passList, els.mobileHubPassList]);
    saveOptions();
  });

  els.card.addEventListener("pointerdown", handlePointerDown);
  els.card.addEventListener("pointermove", handlePointerMove);
  els.card.addEventListener("pointerup", handlePointerUp);
  els.card.addEventListener("pointercancel", handlePointerCancel);

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") swipe("pass");
    if (event.key === "ArrowRight") swipe("smash");
    if (event.key.toLowerCase() === "z" && (event.metaKey || event.ctrlKey)) {
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
    if (els.mobileHub.contains(target) || els.mobileHubToggle.contains(target)) return;
    setMobileHubOpen(false);
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
      setPanelOpen(false);
      setMobileHubOpen(!state.mobileHubOpen);
    });
  }

  if (els.mobileHubClose) {
    els.mobileHubClose.addEventListener("click", () => setMobileHubOpen(false));
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
  const filtersLoaded = loadFilters();
  if (!filtersLoaded && state.selectedTypes.size === 0) {
    state.selectedTypes = new Set(TYPE_LIST);
  }
  loadHistory();
  loadOptions();
  loadFavorites();
  buildGenFilters();
  buildTypeFilters();
  updateMobileFilterBar();
  setupEvents();
  updateCounts();
  renderHistory(state.smashing, [els.smashList, els.mobileHubSmashList]);
  renderHistory(state.passing, [els.passList, els.mobileHubPassList]);
  renderFavorites();
  renderBadges();
  updateUndoLabel();
  if (els.autoReveal.checked) {
    els.card.classList.add("show-stats");
    els.peekBtn.textContent = "Hide stats";
  }
  await rebuildQueue();
};

const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
};

registerServiceWorker();
init();
