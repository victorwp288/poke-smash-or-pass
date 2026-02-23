import { capitalize, formatId, pickMany, pickRandom, shuffle } from "../../shared/util.js";

const GAME_ID = "cry-challenge";
const MAX_HISTORY = 10;
const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const createDefaultState = () => ({
  score: 0,
  streak: 0,
  bestStreak: 0,
  rounds: 0,
  loading: false,
  feedback: "Press play and identify the Pokemon cry.",
  tone: "neutral",
  challenge: null,
  history: [],
});

let state = createDefaultState();
let ctxRef = null;
let root = null;
let rosterPool = [];
let activeRoundToken = 0;

const sanitizeHistory = (history = []) =>
  history.slice(0, MAX_HISTORY).map((entry) => ({
    result: entry.result === "win" ? "win" : "loss",
    correct: String(entry.correct || ""),
    picked: String(entry.picked || ""),
  }));

const pushHistory = (entry) => {
  state.history.unshift(entry);
  if (state.history.length > MAX_HISTORY) {
    state.history.length = MAX_HISTORY;
  }
};

const persistSnapshot = () => {
  if (!ctxRef?.storage) return;
  ctxRef.storage.saveGameState(GAME_ID, {
    data: {
      score: state.score,
      streak: state.streak,
      bestStreak: state.bestStreak,
      rounds: state.rounds,
      feedback: state.feedback,
      tone: state.tone,
      challenge: state.challenge
        ? {
            pokemonName: state.challenge.pokemonName,
            pokemonId: state.challenge.pokemonId,
            sprite: state.challenge.sprite,
            cry: state.challenge.cry,
            options: state.challenge.options,
            selected: state.challenge.selected || "",
            answer: state.challenge.answer,
            solved: Boolean(state.challenge.solved),
          }
        : null,
      history: sanitizeHistory(state.history),
    },
  });
};

const restoreFromData = (data) => {
  if (!data || typeof data !== "object") return;
  state.score = Number(data.score) || 0;
  state.streak = Number(data.streak) || 0;
  state.bestStreak = Number(data.bestStreak) || 0;
  state.rounds = Number(data.rounds) || 0;
  state.feedback = String(data.feedback || "Press play and identify the Pokemon cry.");
  state.tone = ["neutral", "good", "bad"].includes(data.tone)
    ? data.tone
    : "neutral";

  if (data.challenge && typeof data.challenge === "object") {
    state.challenge = {
      pokemonName: String(data.challenge.pokemonName || ""),
      pokemonId: Number(data.challenge.pokemonId) || 0,
      sprite: String(data.challenge.sprite || ""),
      cry: String(data.challenge.cry || ""),
      options: Array.isArray(data.challenge.options)
        ? data.challenge.options
            .map((name) => String(name || "").toLowerCase())
            .filter(Boolean)
        : [],
      selected: String(data.challenge.selected || ""),
      answer: String(data.challenge.answer || ""),
      solved: Boolean(data.challenge.solved),
    };

    if (!state.challenge.options.length || !state.challenge.answer) {
      state.challenge = null;
    }
  }

  state.history = sanitizeHistory(Array.isArray(data.history) ? data.history : []);
};

const rosterFromGens = async (ctx) => {
  const sets = await Promise.all(
    GENERATIONS.map(async (gen) => {
      try {
        return await ctx.repo.getGenerationRoster(gen);
      } catch {
        return [];
      }
    }),
  );

  return Array.from(new Set(sets.flat())).filter(Boolean);
};

const ensureRoster = async (ctx) => {
  if (rosterPool.length >= 24) return rosterPool;

  const fromApi = await rosterFromGens(ctx);
  rosterPool = fromApi.length
    ? fromApi
    : [
        "pikachu",
        "charizard",
        "bulbasaur",
        "squirtle",
        "gengar",
        "snorlax",
        "eevee",
        "lucario",
        "greninja",
        "mewtwo",
        "gardevoir",
        "dragonite",
      ];

  await ctx.repo.warmup(pickMany(rosterPool, 8));
  return rosterPool;
};

const chooseCryCandidate = async (ctx, blocked = new Set()) => {
  const roster = await ensureRoster(ctx);
  const candidates = shuffle(roster).slice(0, Math.min(roster.length, 36));
  for (const name of candidates) {
    const pokemon = await ctx.repo.getPokemon(name);
    if (!pokemon?.cry) continue;
    if (blocked.has(pokemon.rawName)) continue;
    return pokemon;
  }
  return null;
};

const buildChallenge = async (ctx) => {
  const answerPokemon = await chooseCryCandidate(ctx);
  if (!answerPokemon) {
    throw new Error("No Pokemon cries available");
  }

  const decoys = [];
  const blocked = new Set([answerPokemon.rawName]);
  while (decoys.length < 3 && blocked.size < rosterPool.length) {
    const pick = await chooseCryCandidate(ctx, blocked);
    if (!pick) break;
    blocked.add(pick.rawName);
    decoys.push(pick.rawName);
  }

  while (decoys.length < 3) {
    const fallback = pickRandom(rosterPool.filter((name) => !blocked.has(name))) || answerPokemon.rawName;
    blocked.add(fallback);
    if (fallback !== answerPokemon.rawName) {
      decoys.push(fallback);
    }
  }

  const options = shuffle([answerPokemon.rawName, ...decoys.slice(0, 3)]);

  return {
    pokemonName: answerPokemon.name,
    pokemonId: answerPokemon.id,
    sprite: answerPokemon.sprite,
    cry: answerPokemon.cry,
    options,
    selected: "",
    answer: answerPokemon.rawName,
    solved: false,
  };
};

const setFeedback = (message, tone = "neutral") => {
  state.feedback = message;
  state.tone = tone;
};

const answer = (name) => {
  if (!state.challenge || state.challenge.solved) return;

  const normalized = String(name || "").toLowerCase();
  state.challenge.selected = normalized;
  state.challenge.solved = true;
  state.rounds += 1;

  if (normalized === state.challenge.answer) {
    state.score += 150 + state.streak * 10;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    setFeedback(`Correct. That was ${state.challenge.pokemonName}.`, "good");
    pushHistory({ result: "win", correct: state.challenge.pokemonName, picked: capitalize(normalized) });
  } else {
    state.streak = 0;
    setFeedback(`Missed. It was ${state.challenge.pokemonName}.`, "bad");
    pushHistory({ result: "loss", correct: state.challenge.pokemonName, picked: capitalize(normalized) });
  }

  persistSnapshot();
  render();
};

const loadRound = async () => {
  if (!ctxRef) return;
  const roundToken = ++activeRoundToken;
  state.loading = true;
  setFeedback("Loading a new cry...", "neutral");
  render();

  try {
    const challenge = await buildChallenge(ctxRef);
    if (roundToken !== activeRoundToken) return;
    state.challenge = challenge;
    state.loading = false;
    setFeedback("Press play and pick the correct Pokemon.", "neutral");
    persistSnapshot();
    render();
  } catch (error) {
    console.error(error);
    if (roundToken !== activeRoundToken) return;
    state.challenge = null;
    state.loading = false;
    setFeedback("Unable to prepare this round. Try again.", "bad");
    render();
  }
};

const resetSession = () => {
  state = {
    ...createDefaultState(),
    history: [],
  };
  persistSnapshot();
  render();
  loadRound();
};

const playCry = async () => {
  if (!ctxRef?.audio || !state.challenge?.cry) return;
  await ctxRef.audio.play(state.challenge.cry);
};

const metricsMarkup = () => `
  <div class="arcade-metrics">
    <span class="arcade-chip">Score ${state.score}</span>
    <span class="arcade-chip">Streak ${state.streak}</span>
    <span class="arcade-chip">Best ${state.bestStreak}</span>
    <span class="arcade-chip">Rounds ${state.rounds}</span>
  </div>
`;

const historyMarkup = () => {
  if (!state.history.length) {
    return `<p class="cry-empty">No rounds yet.</p>`;
  }

  return `
    <div class="arcade-stack">
      ${state.history
        .map(
          (entry) => `
            <div class="cry-history-row ${entry.result === "win" ? "is-win" : "is-loss"}">
              <strong>${entry.result === "win" ? "Win" : "Miss"}</strong>
              <span>Correct: ${entry.correct}</span>
              <span>Pick: ${entry.picked}</span>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
};

const optionsMarkup = () => {
  if (!state.challenge) return "";
  return `
    <div class="arcade-options cry-options" role="group" aria-label="Cry options">
      ${state.challenge.options
        .map((name) => {
          const selected = state.challenge.selected === name;
          const correct = state.challenge.answer === name;
          const stateClass = state.challenge.solved
            ? correct
              ? "correct"
              : selected
                ? "wrong"
                : ""
            : "";

          return `
            <button class="arcade-option-btn ${stateClass}" data-option="${name}" ${state.loading ? "disabled" : ""}>
              ${capitalize(name)}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
};

const render = () => {
  if (!root) return;

  const challenge = state.challenge;

  root.innerHTML = `
    <section class="game-panel cry-game">
      <div class="arcade-grid cry-layout">
        <article class="arcade-card arcade-stack">
          <h2>Cry Challenge</h2>
          <p>Listen to the cry and choose the matching Pokemon.</p>
          ${metricsMarkup()}
          <div class="arcade-media">
            ${challenge?.sprite ? `<img src="${challenge.sprite}" alt="${challenge.solved ? challenge.pokemonName : "Unknown Pokemon"}" />` : "<span>?</span>"}
          </div>
          <div class="arcade-options">
            <button class="arcade-btn" data-action="play" ${!challenge?.cry ? "disabled" : ""}>Play Cry</button>
            <button class="arcade-btn-ghost" data-action="next" ${state.loading ? "disabled" : ""}>Next Round</button>
            <button class="arcade-btn-danger" data-action="reset">Reset Session</button>
          </div>
          ${optionsMarkup()}
          <p class="cry-feedback is-${state.tone}">${state.feedback}</p>
          ${challenge ? `<p class="cry-id">${formatId(challenge.pokemonId)} ${challenge.solved ? `· ${challenge.pokemonName}` : ""}</p>` : ""}
        </article>

        <aside class="arcade-card arcade-stack">
          <h3>Recent Rounds</h3>
          ${historyMarkup()}
        </aside>
      </div>
    </section>
  `;

  root.querySelector('[data-action="play"]')?.addEventListener("click", () => {
    playCry().catch((error) => console.error(error));
  });

  root.querySelector('[data-action="next"]')?.addEventListener("click", () => {
    loadRound().catch((error) => console.error(error));
  });

  root.querySelector('[data-action="reset"]')?.addEventListener("click", resetSession);

  root.querySelectorAll("[data-option]").forEach((button) => {
    button.addEventListener("click", () => answer(button.dataset.option || ""));
  });
};

const moduleApi = {
  id: GAME_ID,
  title: "Cry Challenge",
  category: "Audio",

  async init(ctx) {
    ctxRef = ctx;
    await ensureRoster(ctx);
  },

  async mount(ctx) {
    ctxRef = ctx;
    root = document.createElement("section");
    root.className = "game-panel cry-wrapper";
    ctx.shell.setGameContent(root);

    if (!state.challenge) {
      await loadRound();
      return;
    }

    render();
  },

  async unmount(ctx) {
    if (ctx?.audio) {
      ctx.audio.stop();
    }
    activeRoundToken += 1;
  },

  getSnapshot() {
    return {
      data: {
        score: state.score,
        streak: state.streak,
        bestStreak: state.bestStreak,
        rounds: state.rounds,
        feedback: state.feedback,
        tone: state.tone,
        challenge: state.challenge,
        history: sanitizeHistory(state.history),
      },
    };
  },

  restoreSnapshot(snapshot) {
    if (!snapshot?.data) return;
    restoreFromData(snapshot.data);
  },
};

export default moduleApi;
