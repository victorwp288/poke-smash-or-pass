import type { PokemonCategory } from "@/lib/pokeapi/types";
import { capitalize, normalizeInlineText } from "@/lib/text";
import type { PokemonTypeName } from "@/lib/typeChart";

export type AppLocale = "en" | "it";

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_STORAGE_KEY = "smashdex_locale";

const getLanguagePriority = (locale: AppLocale) =>
  locale === "it" ? (["it", "en"] as const) : (["en", "it"] as const);

type LocalizedEntryOptions = {
  allowFallback?: boolean;
  preferLatest?: boolean;
};

const getLanguageCandidates = (
  locale: AppLocale,
  options: LocalizedEntryOptions = {}
) => {
  const priority = getLanguagePriority(locale);
  return options.allowFallback === false ? [priority[0]] : priority;
};

const findLocalizedEntry = <T>(
  entries: T[],
  locale: AppLocale,
  selector: (entry: T) => string,
  options: LocalizedEntryOptions = {}
) => {
  const list = Array.isArray(entries) ? entries : [];
  const source = options.preferLatest ? [...list].reverse() : list;

  for (const language of getLanguageCandidates(locale, options)) {
    const match = source.find(
      (entry: any) =>
        entry?.language?.name === language &&
        normalizeInlineText(selector(entry))
    );
    if (match) {
      return normalizeInlineText(selector(match));
    }
  }

  return "";
};

export const getLocalizedName = (
  entries: any[],
  locale: AppLocale,
  fallback = ""
) => {
  return (
    findLocalizedEntry(entries, locale, (entry: any) =>
      String(entry?.name || "")
    ) || fallback
  );
};

export const getLocalizedFlavorText = (
  entries: any[],
  locale: AppLocale,
  fallback: string
) => {
  const list = Array.isArray(entries) ? entries : [];

  for (const language of getLanguagePriority(locale)) {
    const unique = Array.from(
      new Set(
        list
          .filter((entry: any) => entry?.language?.name === language)
          .map((entry: any) => normalizeInlineText(entry?.flavor_text))
          .filter(Boolean)
      )
    );
    if (unique[0]) return unique[0];
  }

  return fallback;
};

export const getLatestLocalizedFlavorText = (
  entries: any[],
  locale: AppLocale,
  fallback: string,
  options: LocalizedEntryOptions = {}
) =>
  findLocalizedEntry(
    entries,
    locale,
    (entry: any) => String(entry?.flavor_text || ""),
    { ...options, preferLatest: true }
  ) || fallback;

export const getLocalizedEffectText = (
  entries: any[],
  locale: AppLocale,
  options: LocalizedEntryOptions = {}
) => {
  return (
    findLocalizedEntry(
      entries,
      locale,
      (entry: any) => String(entry?.short_effect || ""),
      options
    ) ||
    findLocalizedEntry(
      entries,
      locale,
      (entry: any) => String(entry?.effect || ""),
      options
    ) ||
    ""
  );
};

const TYPE_LABELS: Record<AppLocale, Record<PokemonTypeName, string>> = {
  en: {
    normal: "Normal",
    fire: "Fire",
    water: "Water",
    electric: "Electric",
    grass: "Grass",
    ice: "Ice",
    fighting: "Fighting",
    poison: "Poison",
    ground: "Ground",
    flying: "Flying",
    psychic: "Psychic",
    bug: "Bug",
    rock: "Rock",
    ghost: "Ghost",
    dragon: "Dragon",
    dark: "Dark",
    steel: "Steel",
    fairy: "Fairy"
  },
  it: {
    normal: "Normale",
    fire: "Fuoco",
    water: "Acqua",
    electric: "Elettro",
    grass: "Erba",
    ice: "Ghiaccio",
    fighting: "Lotta",
    poison: "Veleno",
    ground: "Terra",
    flying: "Volante",
    psychic: "Psico",
    bug: "Coleottero",
    rock: "Roccia",
    ghost: "Spettro",
    dragon: "Drago",
    dark: "Buio",
    steel: "Acciaio",
    fairy: "Folletto"
  }
};

const CATEGORY_LABELS: Record<AppLocale, Record<PokemonCategory, string>> = {
  en: {
    legendary: "Legendary",
    mythical: "Mythical",
    "ultra-beast": "Ultra Beast",
    paradox: "Paradox",
    standard: "Standard"
  },
  it: {
    legendary: "Leggendario",
    mythical: "Mitico",
    "ultra-beast": "Ultracreatura",
    paradox: "Paradosso",
    standard: "Standard"
  }
};

const STAT_SHORT_LABELS: Record<AppLocale, Record<string, string>> = {
  en: {
    hp: "HP",
    attack: "Atk",
    defense: "Def",
    "special-attack": "SpA",
    "special-defense": "SpD",
    speed: "Spe"
  },
  it: {
    hp: "PS",
    attack: "Att",
    defense: "Dif",
    "special-attack": "Att Sp",
    "special-defense": "Dif Sp",
    speed: "Vel"
  }
};

const STAT_LABELS: Record<AppLocale, Record<string, string>> = {
  en: {
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    "special-attack": "Special Attack",
    "special-defense": "Special Defense",
    speed: "Speed"
  },
  it: {
    hp: "PS",
    attack: "Attacco",
    defense: "Difesa",
    "special-attack": "Attacco speciale",
    "special-defense": "Difesa speciale",
    speed: "Velocita"
  }
};

export const getTypeLabel = (locale: AppLocale, typeName: string) =>
  TYPE_LABELS[locale][typeName as PokemonTypeName] || capitalize(typeName);

export const getCategoryLabel = (locale: AppLocale, category: string) =>
  CATEGORY_LABELS[locale][category as PokemonCategory] || capitalize(category);

export const getStatShortLabel = (locale: AppLocale, statName: string) =>
  STAT_SHORT_LABELS[locale][statName] || capitalize(statName);

export const getStatLabel = (locale: AppLocale, statName: string) =>
  STAT_LABELS[locale][statName] || capitalize(statName);

export const getGenerationLabel = (locale: AppLocale, generation: number) =>
  locale === "it" ? `Generazione ${generation}` : `Generation ${generation}`;

const sharedLabels = {
  language: { en: "Language", it: "Lingua" },
  english: { en: "EN", it: "EN" },
  italian: { en: "IT", it: "IT" }
} as const;

export const en = {
  common: {
    loading: "Loading...",
    close: "Close",
    clear: "Clear",
    tryAgain: "Try again"
  },
  shell: {
    ready: "Ready",
    category: "Smash / Pass",
    title: "SmashDex",
    helpTitle: "Controls",
    openHelp: "Open help",
    show: "Show",
    hide: "Hide",
    mobilePanelBody:
      "Open the deck bar when you want live status, help, or the session score without giving up card space on mobile.",
    desktopOverline: "Mobile-first deck",
    desktopBody:
      "SmashDex only, focused on fast swiping, rich card details, and a cleaner mobile deck-building rhythm.",
    desktopLabel: "Single-mode mobile deck",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode",
    languageLabel: sharedLabels.language.en,
    english: sharedLabels.english.en,
    italian: sharedLabels.italian.en
  },
  deck: {
    loadingRoster: "Loading roster...",
    fetchingRoster: "Fetching roster...",
    empty: "Deck empty - pick more generations.",
    dailyLabel: "Daily deck",
    label: "Deck",
    remaining: (label: string, count: number) => `${label}: ${count} left`
  },
  actionRow: {
    shuffle: "Shuffle",
    pass: "Pass",
    smash: "Smash"
  },
  picker: {
    title: "Pokemon Jump",
    close: "Close Pokemon navigator",
    searchPlaceholder: "Search by name or Pokedex number",
    searchAria: "Search Pokemon list",
    allPokemon: "All Pokemon",
    buildingList: "Building the Pokedex list...",
    listUnavailable: "List unavailable",
    listUnavailableBody: "Couldn’t load the Pokedex list right now.",
    noMatches: "No matches found",
    noMatchesBody:
      "Try a different name, a Pokedex number, or another generation tab.",
    unknown: "Unknown"
  },
  filters: {
    overline: "Options",
    title: "Deck options",
    button: "Options",
    generations: "Generations",
    selectAll: "Select all",
    types: "Types",
    allTypes: "All types",
    deckOptions: "Gameplay",
    smashPassMode: "Smash or pass mode",
    autoReveal: "Auto-reveal stats",
    shinyMode: "Shiny mode",
    dailyDeck: "Daily deck (20)",
    onlyMega: "Only Mega-capable",
    keepHistory: "Keep history",
    badges: "Badges",
    badgesEmpty: "Build streaks and favorites to earn badges.",
    favorites: "Favorites",
    favoritesEmpty: "Save a few Pokemon to build a clue deck for later.",
    exportJson: "Export JSON",
    exportCsv: "Export CSV",
    shareCard: "Share card",
    recentSmash: "Recent smash list",
    recentSmashEmpty: "No smash picks yet.",
    recentPass: "Recent pass list",
    recentPassEmpty: "No passes yet.",
    clearHistory: "Clear history"
  },
  summary: {
    title: "Swipe summary",
    loading: "Loading summary...",
    sentence: (totalSwipes: number, smashRate: number) =>
      `${totalSwipes} swipes with a ${smashRate}% smash rate.`,
    topTypes: "Top types",
    avgStats: "Average battle stats",
    noneYet: "None yet",
    keepSwiping: "Keep swiping"
  },
  card: {
    megaCapable: "Mega-capable",
    abilities: "Abilities",
    hiddenAbility: "Hidden",
    noAbilityDescription: "No description available yet.",
    noFlavorText: "No flavor text yet.",
    battleStats: "Battle stats",
    total: (value: number) => `Total ${value}`,
    evolutionLine: "Evolution line",
    previousArtwork: "Previous artwork",
    nextArtwork: "Next artwork",
    artworkAlt: (name: string) => `${name} artwork`,
    fallbackArtworkAlt: "Pokemon artwork",
    galleryAlt: "Pokemon alternate artwork",
    removeSaved: "Remove from saved Pokemon",
    savePokemon: "Save Pokemon",
    openNavigator: "Open Pokemon navigator",
    noCry: "No cry available",
    cryPlaying: "Playing cry",
    playCry: "Play cry",
    hideStats: "Hide stats",
    peekStats: "Peek stats",
    height: "Height",
    weight: "Weight",
    generationShort: (generation: number) => `Gen ${generation}`,
    generation: (generation: number) => `Generation ${generation}`,
    spriteAlt: (name: string) => `${name} sprite`
  },
  badges: {
    hotStreak: "Hot Streak",
    coldStreak: "Cold Streak",
    typeFan: (typeName: string) => `${typeName} Loyalist`,
    speedDemon: "Speed Demon",
    glassCannon: "Glass Cannon",
    tankMode: "Tank Mode"
  },
  session: {
    overline: "Session pulse",
    title: "Control center",
    deckLeft: "Deck left",
    smash: "Smash",
    pass: "Pass",
    saved: "Saved",
    smashStreak: (count: number) => `Smash streak ${count}`,
    passStreak: (count: number) => `Pass streak ${count}`,
    noCurrentStreak: "No current streak",
    badgeTitle: "Matchup badges",
    badgeEmpty: "Your deck personality shows up here after a few rounds.",
    deckRhythm: "Deck rhythm",
    deckRhythmBody:
      "Keep the card open as your field guide, save favorites for later, and use the options drawer to tighten the pool when you want a more curated SmashDex run.",
    saveFavorites: "Save favorites",
    filterByGen: "Set gens and types",
    reshuffle: "Shuffle when the deck gets stale",
    recentPicks: "Recent picks",
    smashList: "Smash list",
    passList: "Pass list"
  },
  page: {
    helpRows: {
      swipe: "Swipe",
      keys: "Keys",
      undo: "Undo",
      shuffle: "Shuffle",
      peek: "Peek"
    },
    helpValues: {
      swipeEnabled: "Drag left or right",
      swipeDisabled: "Turn on Smash or Pass mode",
      keysEnabled: "Left = Pass, Right = Smash",
      keysDisabled: "Voting keys return with Smash or Pass mode",
      undo: "Cmd/Ctrl + Z",
      shuffleEnabled: "Center button or swipe up on mobile",
      shuffleDisabled: "Center button",
      peek: "Show or hide stats"
    },
    undo: (count: number) => (count ? `Undo ${count}` : "Undo"),
    openDeckTools: "Open deck tools",
    heroTitle: "Swipe fast. Study deeper. Hand off better clues.",
    heroBody:
      "SmashDex now behaves more like a pocket field guide on mobile: the important controls stay thumb-ready, the card keeps all its data, and the whole experience stays focused on Smash or Pass instead of splitting attention across extra modes.",
    savedPokemon: (count: number) => `${count} saved Pokemon`,
    totalVotes: (count: number) => `${count} total votes`,
    emptyTitle: "No Pokemon",
    emptyBody: "Choose more generations or types to keep swiping.",
    votingTip:
      "Tip: swipe left or right to vote, tap the art to cycle images, and use the options drawer when you want setup, history, or exports.",
    guideTip:
      "Tip: use this as a field guide while Smash or Pass mode is off. You can still cycle the art, save favorites, and shuffle into a new pick whenever you want.",
    refreshDeck: "Refresh the deck",
    shareTitle: "SmashDex"
  }
} as const;

export const it = {
  common: {
    loading: "Caricamento...",
    close: "Chiudi",
    clear: "Cancella",
    tryAgain: "Riprova"
  },
  shell: {
    ready: "Pronto",
    category: "Smash / Pass",
    title: "SmashDex",
    helpTitle: "Comandi",
    openHelp: "Apri aiuto",
    show: "Mostra",
    hide: "Nascondi",
    mobilePanelBody:
      "Apri la barra del mazzo quando vuoi stato, aiuto o punteggio senza perdere spazio per la carta sul telefono.",
    desktopOverline: "Mazzo mobile-first",
    desktopBody:
      "SmashDex resta concentrato su swipe rapidi, dettagli ricchi nella carta e un ritmo piu pulito sul mobile.",
    desktopLabel: "Mazzo mobile unico",
    darkMode: "Modalita scura",
    lightMode: "Modalita chiara",
    switchToDark: "Passa alla modalita scura",
    switchToLight: "Passa alla modalita chiara",
    languageLabel: sharedLabels.language.it,
    english: sharedLabels.english.it,
    italian: sharedLabels.italian.it
  },
  deck: {
    loadingRoster: "Caricamento del roster...",
    fetchingRoster: "Recupero del roster...",
    empty: "Mazzo vuoto - scegli piu generazioni.",
    dailyLabel: "Mazzo giornaliero",
    label: "Mazzo",
    remaining: (label: string, count: number) => `${label}: ${count} rimasti`
  },
  actionRow: {
    shuffle: "Mischia",
    pass: "Passa",
    smash: "Smash"
  },
  picker: {
    title: "Pokedex",
    close: "Chiudi il navigatore Pokemon",
    searchPlaceholder: "Cerca per nome o numero Pokedex",
    searchAria: "Cerca nella lista Pokemon",
    allPokemon: "Tutti i Pokemon",
    buildingList: "Sto preparando la lista del Pokedex...",
    listUnavailable: "Lista non disponibile",
    listUnavailableBody: "Non riesco a caricare la lista del Pokedex adesso.",
    noMatches: "Nessun risultato",
    noMatchesBody:
      "Prova con un altro nome, un numero Pokedex o una generazione diversa.",
    unknown: "Sconosciuto"
  },
  filters: {
    overline: "Opzioni",
    title: "Opzioni del mazzo",
    button: "Opzioni",
    generations: "Generazioni",
    selectAll: "Seleziona tutto",
    types: "Tipi",
    allTypes: "Tutti i tipi",
    deckOptions: "Gioco",
    smashPassMode: "Modalita smash o pass",
    autoReveal: "Mostra subito le statistiche",
    shinyMode: "Modalita shiny",
    dailyDeck: "Mazzo giornaliero (20)",
    onlyMega: "Solo megaevolvibili",
    keepHistory: "Mantieni cronologia",
    badges: "Badge",
    badgesEmpty: "Costruisci serie e preferiti per sbloccare i badge.",
    favorites: "Preferiti",
    favoritesEmpty:
      "Salva qualche Pokemon per creare un piccolo mazzo di indizi per dopo.",
    exportJson: "Esporta JSON",
    exportCsv: "Esporta CSV",
    shareCard: "Condividi card",
    recentSmash: "Ultimi smash",
    recentSmashEmpty: "Ancora nessuno smash.",
    recentPass: "Ultimi pass",
    recentPassEmpty: "Ancora nessun pass.",
    clearHistory: "Cancella cronologia"
  },
  summary: {
    title: "Riepilogo swipe",
    loading: "Sto preparando il riepilogo...",
    sentence: (totalSwipes: number, smashRate: number) =>
      `${totalSwipes} swipe con un tasso smash del ${smashRate}%.`,
    topTypes: "Tipi principali",
    avgStats: "Statistiche medie",
    noneYet: "Ancora niente",
    keepSwiping: "Continua a scorrere"
  },
  card: {
    megaCapable: "Puo megaevolversi",
    abilities: "Abilita",
    hiddenAbility: "Nascosta",
    noAbilityDescription: "Nessuna descrizione disponibile.",
    noFlavorText: "Nessuna descrizione ancora.",
    battleStats: "Statistiche lotta",
    total: (value: number) => `Totale ${value}`,
    evolutionLine: "Linea evolutiva",
    previousArtwork: "Artwork precedente",
    nextArtwork: "Artwork successivo",
    artworkAlt: (name: string) => `Artwork di ${name}`,
    fallbackArtworkAlt: "Artwork Pokemon",
    galleryAlt: "Artwork alternativo del Pokemon",
    removeSaved: "Rimuovi dai Pokemon salvati",
    savePokemon: "Salva Pokemon",
    openNavigator: "Apri navigatore Pokemon",
    noCry: "Verso non disponibile",
    cryPlaying: "Verso in riproduzione",
    playCry: "Riproduci verso",
    hideStats: "Nascondi stats",
    peekStats: "Guarda stats",
    height: "Altezza",
    weight: "Peso",
    generationShort: (generation: number) => `Gen ${generation}`,
    generation: (generation: number) => `Generazione ${generation}`,
    spriteAlt: (name: string) => `Sprite di ${name}`
  },
  badges: {
    hotStreak: "Serie calda",
    coldStreak: "Serie fredda",
    typeFan: (typeName: string) => `Fan di ${typeName}`,
    speedDemon: "Fulmine",
    glassCannon: "Cannone di vetro",
    tankMode: "Modalita tank"
  },
  session: {
    overline: "Ritmo sessione",
    title: "Centro controllo",
    deckLeft: "Nel mazzo",
    smash: "Smash",
    pass: "Pass",
    saved: "Salvati",
    smashStreak: (count: number) => `Serie smash ${count}`,
    passStreak: (count: number) => `Serie pass ${count}`,
    noCurrentStreak: "Nessuna serie attiva",
    badgeTitle: "Badge partita",
    badgeEmpty: "La personalita del tuo mazzo si vede qui dopo qualche round.",
    deckRhythm: "Ritmo del mazzo",
    deckRhythmBody:
      "Tieni la carta aperta come guida, salva i preferiti per dopo e usa il pannello opzioni quando vuoi un giro SmashDex piu curato.",
    saveFavorites: "Salva preferiti",
    filterByGen: "Scegli gen e tipi",
    reshuffle: "Mischia quando il mazzo si spegne",
    recentPicks: "Scelte recenti",
    smashList: "Lista smash",
    passList: "Lista pass"
  },
  page: {
    helpRows: {
      swipe: "Scorri",
      keys: "Tasti",
      undo: "Annulla",
      shuffle: "Mischia",
      peek: "Mostra dati"
    },
    helpValues: {
      swipeEnabled: "Trascina a sinistra o destra",
      swipeDisabled: "Attiva la modalita smash o pass",
      keysEnabled: "Sinistra = Pass, Destra = Smash",
      keysDisabled: "I tasti voto tornano con la modalita smash o pass",
      undo: "Cmd/Ctrl + Z",
      shuffleEnabled: "Pulsante centrale o swipe in alto su mobile",
      shuffleDisabled: "Pulsante centrale",
      peek: "Mostra o nascondi le statistiche"
    },
    undo: (count: number) => (count ? `Annulla ${count}` : "Annulla"),
    openDeckTools: "Apri strumenti del mazzo",
    heroTitle: "Scorri veloce. Studia meglio. Dai indizi migliori.",
    heroBody:
      "SmashDex ora si comporta piu come una guida tascabile sul mobile: i controlli restano a portata di pollice, la carta mantiene tutti i dati e tutto resta centrato su Smash o Pass.",
    savedPokemon: (count: number) => `${count} Pokemon salvati`,
    totalVotes: (count: number) => `${count} voti totali`,
    emptyTitle: "Nessun Pokemon",
    emptyBody: "Scegli piu generazioni o tipi per continuare a scorrere.",
    votingTip:
      "Suggerimento: scorri a sinistra o destra per votare, tocca l'artwork per cambiare immagine e usa il pannello controlli per filtri, cronologia o export.",
    guideTip:
      "Suggerimento: usa questa schermata come guida quando la modalita smash o pass e spenta. Puoi comunque cambiare artwork, salvare preferiti e mischiare quando vuoi.",
    refreshDeck: "Rinfresca il mazzo",
    shareTitle: "SmashDex"
  }
} as const;

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => R
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T;

export type LocaleStrings = Widen<typeof en>;

export const localeStrings = { en, it } as const;

export const getLocaleStrings = (locale: AppLocale): LocaleStrings =>
  locale === "it" ? it : en;
