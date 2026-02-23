const GLOBAL_KEY = "arcade_global_v1";
const GAME_PREFIX = "arcade_game_v1_";
const MIGRATION_MARKER = "arcade_legacy_migrated_v1";

const safeParse = (raw, fallback) => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const safeRead = (key, fallback = null) => {
  try {
    return safeParse(localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
};

const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/private mode errors
  }
};

const legacyKeys = [
  "smashdex_history",
  "smashdex_filters",
  "smashdex_options",
  "smashdex_favorites",
  "smashdex_mode",
  "smashdex_guess_stats",
];

export const createStorageApi = () => {
  return {
    loadGameState(gameId) {
      if (!gameId) return null;
      return safeRead(`${GAME_PREFIX}${gameId}`, null);
    },

    saveGameState(gameId, snapshot) {
      if (!gameId) return;
      safeWrite(`${GAME_PREFIX}${gameId}`, {
        ...snapshot,
        updatedAt: new Date().toISOString(),
      });
    },

    loadGlobalPrefs() {
      return safeRead(GLOBAL_KEY, {
        lastGameId: "smash",
        reducedMotion: false,
        muted: false,
      });
    },

    saveGlobalPrefs(prefs) {
      safeWrite(GLOBAL_KEY, {
        ...(this.loadGlobalPrefs() || {}),
        ...(prefs || {}),
      });
    },

    migrateLegacyKeys() {
      try {
        if (localStorage.getItem(MIGRATION_MARKER)) return;
        const smashMode = localStorage.getItem("smashdex_mode");
        const guessed = safeRead("smashdex_guess_stats", null);
        const history = safeRead("smashdex_history", null);

        const existingGlobal = this.loadGlobalPrefs() || {};
        this.saveGlobalPrefs({
          ...existingGlobal,
          lastGameId: smashMode === "guess" ? "guess" : existingGlobal.lastGameId || "smash",
        });

        if (history) {
          this.saveGameState("smash", { data: { legacyHistory: history } });
        }

        if (guessed) {
          this.saveGameState("guess", { data: { legacyStats: guessed } });
        }

        const legacyPresence = legacyKeys.reduce((acc, key) => {
          acc[key] = localStorage.getItem(key) !== null;
          return acc;
        }, {});

        localStorage.setItem(MIGRATION_MARKER, JSON.stringify({
          migratedAt: new Date().toISOString(),
          legacyPresence,
        }));
      } catch {
        // Ignore storage migration failures
      }
    },
  };
};

/**
 * @typedef {ReturnType<typeof createStorageApi>} StorageApi
 */
