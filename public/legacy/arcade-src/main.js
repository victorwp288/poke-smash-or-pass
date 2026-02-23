import { createAppShell } from "./core/app-shell.js";
import { gameFlags } from "./core/game-flags.js";
import { GameRegistry } from "./core/game-registry.js";
import { PokemonRepo } from "./core/pokemon-repo.js";
import { createStorageApi } from "./core/storage.js";
import { seededRng } from "./shared/util.js";

const shell = createAppShell();
const storage = createStorageApi();
const repo = new PokemonRepo();
const registry = new GameRegistry(gameFlags);

const audio = {
  current: null,
  async play(src) {
    if (!src) return;
    this.stop();
    const audioNode = new Audio(src);
    this.current = audioNode;
    try {
      await audioNode.play();
    } catch {
      this.current = null;
    }
  },
  stop() {
    if (!this.current) return;
    this.current.pause();
    this.current.currentTime = 0;
    this.current = null;
  },
};

const gameDefinitions = [
  {
    id: "smash",
    title: "Smash / Pass",
    category: "Classic",
    styles: ["src/games/smash/styles.css"],
    loader: () => import("./games/smash/index.js"),
  },
  {
    id: "guess",
    title: "GuessDex",
    category: "Classic",
    styles: ["src/games/guess/styles.css"],
    loader: () => import("./games/guess/index.js"),
  },
  {
    id: "champion-gauntlet",
    title: "Champion Gauntlet",
    category: "Flagship",
    styles: ["src/games/champion-gauntlet/styles.css"],
    loader: () => import("./games/champion-gauntlet/index.js"),
  },
  {
    id: "type-clash",
    title: "Type Clash",
    category: "Quick Tactics",
    styles: ["src/games/type-clash/styles.css"],
    loader: () => import("./games/type-clash/index.js"),
  },
  {
    id: "evo-relay",
    title: "Evolution Relay",
    category: "Puzzle",
    styles: ["src/games/evo-relay/styles.css"],
    loader: () => import("./games/evo-relay/index.js"),
  },
  {
    id: "stat-sprint",
    title: "Stat Sprint",
    category: "Puzzle",
    styles: ["src/games/stat-sprint/styles.css"],
    loader: () => import("./games/stat-sprint/index.js"),
  },
  {
    id: "move-master",
    title: "Move Master",
    category: "Combat",
    styles: ["src/games/move-master/styles.css"],
    loader: () => import("./games/move-master/index.js"),
  },
  {
    id: "ability-link",
    title: "Ability Link",
    category: "Knowledge",
    styles: ["src/games/ability-link/styles.css"],
    loader: () => import("./games/ability-link/index.js"),
  },
  {
    id: "silhouette-blitz",
    title: "Silhouette Blitz",
    category: "Reflex",
    styles: ["src/games/silhouette-blitz/styles.css"],
    loader: () => import("./games/silhouette-blitz/index.js"),
  },
  {
    id: "cry-challenge",
    title: "Cry Challenge",
    category: "Audio",
    styles: ["src/games/cry-challenge/styles.css"],
    loader: () => import("./games/cry-challenge/index.js"),
  },
  {
    id: "dex-rush",
    title: "Dex Rush",
    category: "Trivia",
    styles: ["src/games/dex-rush/styles.css"],
    loader: () => import("./games/dex-rush/index.js"),
  },
];

gameDefinitions.forEach((definition) => {
  registry.registerGame({ ...definition, module: null, inited: false });
});

const ctx = {
  repo,
  storage,
  shell,
  audio,
  rng: {
    random: () => Math.random(),
    seed: (seed) => seededRng(seed),
  },
  track(eventName, payload = {}) {
    console.debug("[arcade-event]", eventName, payload);
  },
};

let activeId = "";
let activeModule = null;

const saveActiveSnapshot = () => {
  if (!activeId || !activeModule?.getSnapshot) return;
  const snapshot = activeModule.getSnapshot();
  if (snapshot) {
    storage.saveGameState(activeId, snapshot);
  }
};

const loadModule = async (record) => {
  if (record.module) return record.module;
  const imported = await record.loader();
  record.module = imported.default || imported;
  if (!record.module?.id) {
    record.module.id = record.id;
  }
  return record.module;
};

const switchGame = async (gameId) => {
  if (!gameId) return;
  const record = registry.getGame(gameId);
  if (!record) return;
  if (gameId === activeId) return;

  shell.setStatus(`Loading ${record.title}...`);

  if (activeModule?.unmount) {
    saveActiveSnapshot();
    await activeModule.unmount(ctx);
  }

  shell.clearGameContent();
  shell.ensureGameStyles(record.styles || []);

  const module = await loadModule(record);

  if (!record.inited && module.init) {
    await module.init(ctx);
    record.inited = true;
  }

  const snapshot = storage.loadGameState(gameId);
  if (module.restoreSnapshot) {
    module.restoreSnapshot(snapshot);
  }

  if (module.mount) {
    await module.mount(ctx);
  }

  activeId = gameId;
  activeModule = module;

  shell.setActiveTab(gameId);
  shell.setHeader({ title: record.title, categoryText: record.category });
  shell.setStatus(`${record.title} ready`);
  storage.saveGlobalPrefs({ lastGameId: gameId });
};

const init = async () => {
  storage.migrateLegacyKeys();
  const prefs = storage.loadGlobalPrefs();
  const games = registry.listGames({ visibleOnly: true });
  const initial = games.some((game) => game.id === prefs.lastGameId)
    ? prefs.lastGameId
    : games[0]?.id;

  shell.renderTabs(games, initial, (id) => {
    switchGame(id).catch((error) => {
      console.error(error);
      shell.setStatus("Something failed loading this game");
    });
  });

  if (initial) {
    await switchGame(initial);
  } else {
    shell.setStatus("No games available");
  }
};

const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
};

registerServiceWorker();
init().catch((error) => {
  console.error(error);
  shell.setStatus("Arcade failed to start");
});
