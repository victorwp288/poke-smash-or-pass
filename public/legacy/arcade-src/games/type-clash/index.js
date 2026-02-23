import { TYPE_LIST, capitalize, typeEffectiveness } from "../../shared/util.js";

const MODULE_ID = "type-clash";
const ROSTER_GENS = [1, 2, 3, 4];
const FALLBACK_NAMES = ["bulbasaur", "charmander", "squirtle", "pikachu", "eevee", "snorlax"];
const HISTORY_LIMIT = 8;
const DEFAULT_FEEDBACK = "Pick the Pokemon that would take the bigger hit.";

const state = {
  ctx: null,
  root: null,
  isMounted: false,
  requestId: 0,
  roster: [],
  pokemonCache: new Map(),
  pendingSnapshot: null,
  score: 0,
  rounds: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  round: null,
  revealed: false,
  selectedIndex: null,
  feedback: DEFAULT_FEEDBACK,
  history: [],
  busy: false,
  clickHandler: null,
};

const unique = (items) => Array.from(new Set((items || []).filter(Boolean)));

const rand = () => (state.ctx?.rng?.random ? state.ctx.rng.random() : Math.random());

const pickRandom = (items) => {
  if (!items?.length) return null;
  return items[Math.floor(rand() * items.length)] || null;
};

const pickDistinctNames = (count, blocked = new Set()) => {
  if (!state.roster.length) return [];
  const pool = state.roster.filter((name) => !blocked.has(name));
  const picked = [];
  const used = new Set();
  while (picked.length < count && picked.length < pool.length) {
    const name = pickRandom(pool);
    if (!name || used.has(name)) continue;
    used.add(name);
    picked.push(name);
  }
  return picked;
};

const formatMultiplier = (value) => {
  if (!Number.isFinite(value)) return "0x";
  if (Number.isInteger(value)) return `${value}x`;
  return `${value.toFixed(2).replace(/\.?0+$/, "")}x`;
};

const setSafeStatus = (text) => {
  try {
    state.ctx?.shell?.setStatus(text);
  } catch {
    // Ignore shell status errors.
  }
};

const track = (eventName, payload = {}) => {
  try {
    state.ctx?.track?.(eventName, payload);
  } catch {
    // Ignore analytics errors.
  }
};

const ensureRoster = async () => {
  if (state.roster.length) return;
  const sets = await Promise.all(
    ROSTER_GENS.map((genId) => state.ctx.repo.getGenerationRoster(genId).catch(() => [])),
  );
  state.roster = unique(sets.flat());
  if (!state.roster.length) {
    state.roster = [...FALLBACK_NAMES];
  }
};

const getPokemon = async (nameOrId) => {
  const key = String(nameOrId || "").toLowerCase();
  if (!key) return null;
  if (state.pokemonCache.has(key)) return state.pokemonCache.get(key);
  const pokemon = await state.ctx.repo.getPokemon(key);
  state.pokemonCache.set(key, pokemon);
  if (pokemon?.id) state.pokemonCache.set(String(pokemon.id), pokemon);
  if (pokemon?.rawName) state.pokemonCache.set(String(pokemon.rawName).toLowerCase(), pokemon);
  return pokemon;
};

const serializeRound = () => {
  if (!state.round) return null;
  return {
    attackType: state.round.attackType,
    optionNames: state.round.options.map((entry) => entry.rawName),
    multipliers: [...state.round.multipliers],
    correctIndex: state.round.correctIndex,
  };
};

const hydrateRound = async (rawRound) => {
  if (!rawRound || !rawRound.attackType || !Array.isArray(rawRound.optionNames)) {
    return null;
  }
  if (rawRound.optionNames.length !== 2) return null;
  const [left, right] = await Promise.all(rawRound.optionNames.map((name) => getPokemon(name)));
  if (!left || !right || left.id === right.id) return null;
  const multipliers = Array.isArray(rawRound.multipliers) && rawRound.multipliers.length === 2
    ? rawRound.multipliers
    : [
      typeEffectiveness(rawRound.attackType, left.typeNames),
      typeEffectiveness(rawRound.attackType, right.typeNames),
    ];
  const fallbackCorrect = multipliers[0] >= multipliers[1] ? 0 : 1;
  const correctIndex = Number.isInteger(rawRound.correctIndex) ? rawRound.correctIndex : fallbackCorrect;
  return {
    attackType: rawRound.attackType,
    options: [left, right],
    multipliers,
    correctIndex: correctIndex === 1 ? 1 : 0,
  };
};

const resetStats = () => {
  state.score = 0;
  state.rounds = 0;
  state.correct = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.history = [];
  state.selectedIndex = null;
  state.revealed = false;
  state.feedback = DEFAULT_FEEDBACK;
};

const buildRound = async () => {
  const requestId = ++state.requestId;
  state.busy = true;
  state.selectedIndex = null;
  state.revealed = false;
  state.feedback = "Loading matchup...";
  render();

  try {
    await ensureRoster();
    let createdRound = null;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const attackType = pickRandom(TYPE_LIST);
      const picked = pickDistinctNames(2);
      if (picked.length < 2 || !attackType) continue;
      const [left, right] = await Promise.all(picked.map((name) => getPokemon(name)));
      if (!left || !right || left.id === right.id) continue;
      const multipliers = [
        typeEffectiveness(attackType, left.typeNames),
        typeEffectiveness(attackType, right.typeNames),
      ];
      if (multipliers[0] === multipliers[1]) continue;
      createdRound = {
        attackType,
        options: [left, right],
        multipliers,
        correctIndex: multipliers[0] > multipliers[1] ? 0 : 1,
      };
      break;
    }

    if (!createdRound) {
      throw new Error("Could not create a Type Clash round.");
    }

    if (requestId !== state.requestId) return;
    state.round = createdRound;
    state.feedback = DEFAULT_FEEDBACK;
    track("type-clash:round", {
      attackType: createdRound.attackType,
      options: createdRound.options.map((entry) => entry.rawName),
    });
  } catch (error) {
    if (requestId !== state.requestId) return;
    console.error(error);
    state.round = null;
    state.feedback = "Could not load matchup. Try Next Round.";
    setSafeStatus("Type Clash failed to load a matchup");
  } finally {
    if (requestId !== state.requestId) return;
    state.busy = false;
    render();
  }
};

const applyChoice = (index) => {
  if (!state.round || state.revealed || state.busy) return;
  const picked = Number(index);
  if (!Number.isInteger(picked) || picked < 0 || picked > 1) return;

  state.rounds += 1;
  state.selectedIndex = picked;
  state.revealed = true;
  const correct = picked === state.round.correctIndex;
  if (correct) {
    state.score += 1;
    state.correct += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.feedback = "Correct. You read the matchup.";
  } else {
    state.streak = 0;
    state.feedback = "Missed. Check multipliers, then run it back.";
  }

  const pickedPokemon = state.round.options[picked];
  const correctPokemon = state.round.options[state.round.correctIndex];
  state.history.unshift({
    attackType: state.round.attackType,
    pickedName: pickedPokemon?.name || "Unknown",
    correctName: correctPokemon?.name || "Unknown",
    correct,
  });
  state.history = state.history.slice(0, HISTORY_LIMIT);

  track("type-clash:answer", {
    correct,
    attackType: state.round.attackType,
    picked: pickedPokemon?.rawName,
    expected: correctPokemon?.rawName,
  });
  render();
};

const renderOption = (pokemon, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "type-clash-option";
  button.dataset.choice = String(index);

  if (state.busy || !state.round) button.disabled = true;
  if (state.revealed) {
    if (index === state.round.correctIndex) button.classList.add("is-correct");
    if (state.selectedIndex === index && index !== state.round.correctIndex) {
      button.classList.add("is-wrong");
    }
    if (state.selectedIndex === index) button.classList.add("was-picked");
  }

  const media = document.createElement("div");
  media.className = "arcade-media type-clash-media";
  if (pokemon?.sprite) {
    const image = document.createElement("img");
    image.src = pokemon.sprite;
    image.alt = pokemon.name || "Pokemon artwork";
    image.loading = "lazy";
    media.appendChild(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "type-clash-fallback";
    fallback.textContent = "No art";
    media.appendChild(fallback);
  }

  const meta = document.createElement("div");
  meta.className = "type-clash-option-meta";
  const title = document.createElement("h3");
  title.textContent = pokemon?.name || "Unknown";
  const types = document.createElement("p");
  types.className = "type-clash-types";
  types.textContent = (pokemon?.typeNames || []).map((name) => capitalize(name)).join(" / ") || "Unknown typing";

  meta.appendChild(title);
  meta.appendChild(types);

  if (state.revealed && state.round) {
    const multiplier = document.createElement("p");
    multiplier.className = "type-clash-multiplier";
    multiplier.textContent = `${formatMultiplier(state.round.multipliers[index])} damage`;
    meta.appendChild(multiplier);
  }

  button.appendChild(media);
  button.appendChild(meta);
  return button;
};

const renderHistory = (historyNode) => {
  historyNode.innerHTML = "";
  if (!state.history.length) {
    const empty = document.createElement("li");
    empty.className = "type-clash-history-empty";
    empty.textContent = "No rounds yet.";
    historyNode.appendChild(empty);
    return;
  }

  state.history.forEach((entry) => {
    const item = document.createElement("li");
    item.className = entry.correct ? "is-correct" : "is-wrong";
    item.textContent = `${capitalize(entry.attackType)}: picked ${entry.pickedName}, answer ${entry.correctName}`;
    historyNode.appendChild(item);
  });
};

function render() {
  if (!state.isMounted || !state.root) return;

  const scoreNode = state.root.querySelector("[data-tc-score]");
  const roundsNode = state.root.querySelector("[data-tc-rounds]");
  const accuracyNode = state.root.querySelector("[data-tc-accuracy]");
  const streakNode = state.root.querySelector("[data-tc-streak]");
  const bestNode = state.root.querySelector("[data-tc-best]");
  const promptNode = state.root.querySelector("[data-tc-prompt]");
  const feedbackNode = state.root.querySelector("[data-tc-feedback]");
  const optionsNode = state.root.querySelector("[data-tc-options]");
  const nextBtn = state.root.querySelector("[data-action='next']");
  const historyNode = state.root.querySelector("[data-tc-history]");

  const accuracy = state.rounds ? Math.round((state.correct / state.rounds) * 100) : 0;
  if (scoreNode) scoreNode.textContent = String(state.score);
  if (roundsNode) roundsNode.textContent = String(state.rounds);
  if (accuracyNode) accuracyNode.textContent = `${accuracy}%`;
  if (streakNode) streakNode.textContent = String(state.streak);
  if (bestNode) bestNode.textContent = String(state.bestStreak);

  if (promptNode) {
    promptNode.textContent = state.round
      ? `Which Pokemon takes more damage from ${capitalize(state.round.attackType)}-type attacks?`
      : "Build a matchup to begin.";
  }

  if (feedbackNode) {
    feedbackNode.textContent = state.feedback;
    feedbackNode.classList.toggle("is-busy", state.busy);
  }

  if (optionsNode) {
    optionsNode.innerHTML = "";
    if (state.round) {
      state.round.options.forEach((pokemon, index) => {
        optionsNode.appendChild(renderOption(pokemon, index));
      });
    } else {
      const placeholder = document.createElement("p");
      placeholder.className = "type-clash-placeholder";
      placeholder.textContent = "No matchup available.";
      optionsNode.appendChild(placeholder);
    }
  }

  if (nextBtn) nextBtn.disabled = state.busy;
  if (historyNode) renderHistory(historyNode);
}

const buildLayout = (ctx) => {
  const panel = ctx.shell.createPanel("game-panel type-clash-game");
  panel.innerHTML = `
    <section class="arcade-card type-clash-stats">
      <div class="arcade-metrics">
        <span class="arcade-chip">Score <strong data-tc-score>0</strong></span>
        <span class="arcade-chip">Rounds <strong data-tc-rounds>0</strong></span>
        <span class="arcade-chip">Accuracy <strong data-tc-accuracy>0%</strong></span>
        <span class="arcade-chip">Streak <strong data-tc-streak>0</strong></span>
        <span class="arcade-chip">Best <strong data-tc-best>0</strong></span>
      </div>
    </section>
    <section class="arcade-card type-clash-board">
      <p class="type-clash-kicker">Type Matchup Drill</p>
      <h2 data-tc-prompt>Build a matchup to begin.</h2>
      <div class="type-clash-options" data-tc-options></div>
      <p class="type-clash-feedback" data-tc-feedback>${DEFAULT_FEEDBACK}</p>
    </section>
    <section class="arcade-card type-clash-controls">
      <div class="arcade-options">
        <button type="button" class="arcade-btn" data-action="next">Next Round</button>
        <button type="button" class="arcade-btn-ghost" data-action="reset">Reset Score</button>
      </div>
    </section>
    <section class="arcade-card type-clash-history-card">
      <h3>Recent Calls</h3>
      <ol class="type-clash-history" data-tc-history></ol>
    </section>
  `;
  return panel;
};

const restoreFromPendingSnapshot = async () => {
  const snapshot = state.pendingSnapshot;
  state.pendingSnapshot = null;
  if (!snapshot) {
    resetStats();
    await buildRound();
    return;
  }

  state.score = Number(snapshot.score) || 0;
  state.rounds = Number(snapshot.rounds) || 0;
  state.correct = Number(snapshot.correct) || 0;
  state.streak = Number(snapshot.streak) || 0;
  state.bestStreak = Number(snapshot.bestStreak) || 0;
  state.feedback = typeof snapshot.feedback === "string" ? snapshot.feedback : DEFAULT_FEEDBACK;
  state.selectedIndex = Number.isInteger(snapshot.selectedIndex) ? snapshot.selectedIndex : null;
  state.revealed = Boolean(snapshot.revealed);
  state.history = Array.isArray(snapshot.history) ? snapshot.history.slice(0, HISTORY_LIMIT) : [];

  let restoredRound = null;
  try {
    restoredRound = await hydrateRound(snapshot.round);
  } catch (error) {
    console.error(error);
    restoredRound = null;
  }

  state.round = restoredRound;
  if (!state.round) {
    state.revealed = false;
    state.selectedIndex = null;
    await buildRound();
    return;
  }

  render();
};

const wireEvents = () => {
  if (!state.root) return;
  state.clickHandler = (event) => {
    const optionButton = event.target.closest("[data-choice]");
    if (optionButton) {
      applyChoice(Number(optionButton.dataset.choice));
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action === "next") {
      buildRound().catch((error) => {
        console.error(error);
        state.feedback = "Could not load matchup. Try again.";
        state.busy = false;
        render();
      });
      return;
    }
    if (action === "reset") {
      resetStats();
      buildRound().catch((error) => {
        console.error(error);
        state.feedback = "Reset failed. Try Next Round.";
        state.busy = false;
        render();
      });
    }
  };
  state.root.addEventListener("click", state.clickHandler);
};

const clearEvents = () => {
  if (state.root && state.clickHandler) {
    state.root.removeEventListener("click", state.clickHandler);
  }
  state.clickHandler = null;
};

export default {
  id: MODULE_ID,
  title: "Type Clash",
  category: "Quick Tactics",

  async init(ctx) {
    state.ctx = ctx;
    await ensureRoster();
    await ctx.repo.warmup(state.roster.slice(0, 6));
  },

  async mount(ctx) {
    state.ctx = ctx;
    state.isMounted = true;
    state.root = buildLayout(ctx);
    wireEvents();
    ctx.shell.setGameContent(state.root);
    await restoreFromPendingSnapshot();
  },

  async unmount() {
    state.isMounted = false;
    state.requestId += 1;
    state.busy = false;
    clearEvents();
    state.root = null;
  },

  getSnapshot() {
    return {
      data: {
        score: state.score,
        rounds: state.rounds,
        correct: state.correct,
        streak: state.streak,
        bestStreak: state.bestStreak,
        round: serializeRound(),
        selectedIndex: state.selectedIndex,
        revealed: state.revealed,
        feedback: state.feedback,
        history: state.history.slice(0, HISTORY_LIMIT),
      },
    };
  },

  restoreSnapshot(snapshot) {
    state.pendingSnapshot = snapshot?.data || null;
  },
};
