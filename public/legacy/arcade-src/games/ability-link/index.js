import { capitalize } from "../../shared/util.js";

const MODULE_ID = "ability-link";
const ROSTER_GENS = [1, 2, 3, 4, 5];
const FALLBACK_NAMES = ["pikachu", "gengar", "alakazam", "snorlax", "lucario", "greninja"];
const HISTORY_LIMIT = 8;
const DEFAULT_FEEDBACK = "Pick the Pokemon that can have this ability.";

const state = {
  ctx: null,
  root: null,
  isMounted: false,
  requestId: 0,
  roster: [],
  pokemonCache: new Map(),
  abilityCache: new Map(),
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

const normalizeInline = (text = "") => String(text).replace(/\s+/g, " ").trim();

const rand = () => (state.ctx?.rng?.random ? state.ctx.rng.random() : Math.random());

const pickRandom = (items) => {
  if (!items?.length) return null;
  return items[Math.floor(rand() * items.length)] || null;
};

const shuffle = (items) => {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
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

const getAbilityDescription = async (abilityRef) => {
  const abilityName = String(abilityRef?.name || "").toLowerCase();
  if (!abilityName) return "No effect text available.";
  const cacheKey = String(abilityRef?.url || abilityName);
  if (state.abilityCache.has(cacheKey)) return state.abilityCache.get(cacheKey);

  try {
    const payload = await state.ctx.repo.fetchJson(abilityRef?.url || `ability/${abilityName}`);
    const english = Array.isArray(payload?.effect_entries)
      ? payload.effect_entries.find((entry) => entry.language?.name === "en")
      : null;
    const description = normalizeInline(english?.short_effect || english?.effect || "No effect text available.");
    state.abilityCache.set(cacheKey, description);
    state.abilityCache.set(abilityName, description);
    return description;
  } catch {
    const fallback = "No effect text available.";
    state.abilityCache.set(cacheKey, fallback);
    return fallback;
  }
};

const pokemonHasAbility = (pokemon, abilityName) =>
  (pokemon?.abilities || []).some((entry) => entry?.ability?.name === abilityName);

const serializeRound = () => {
  if (!state.round) return null;
  return {
    abilityName: state.round.abilityName,
    description: state.round.description,
    optionNames: state.round.options.map((entry) => entry.rawName),
    correctIndex: state.round.correctIndex,
    isHidden: state.round.isHidden,
  };
};

const hydrateRound = async (rawRound) => {
  if (!rawRound || !rawRound.abilityName || !Array.isArray(rawRound.optionNames)) return null;
  if (rawRound.optionNames.length < 2) return null;

  const options = await Promise.all(rawRound.optionNames.map((name) => getPokemon(name)));
  if (options.some((entry) => !entry)) return null;
  const correctIndex = Number.isInteger(rawRound.correctIndex) ? rawRound.correctIndex : -1;
  if (correctIndex < 0 || correctIndex >= options.length) return null;

  return {
    abilityName: rawRound.abilityName,
    description: normalizeInline(rawRound.description || "No effect text available."),
    options,
    correctIndex,
    isHidden: Boolean(rawRound.isHidden),
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
  state.feedback = "Loading ability puzzle...";
  render();

  try {
    await ensureRoster();
    let nextRound = null;

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const answerName = pickRandom(state.roster);
      if (!answerName) continue;
      const answer = await getPokemon(answerName);
      const abilities = (answer?.abilities || [])
        .map((entry) => ({
          name: entry?.ability?.name || "",
          url: entry?.ability?.url || "",
          isHidden: Boolean(entry?.is_hidden),
        }))
        .filter((entry) => entry.name);
      if (!abilities.length) continue;

      const chosenAbility = pickRandom(abilities);
      if (!chosenAbility?.name) continue;

      const decoys = [];
      const usedNames = new Set([answer.rawName]);
      for (let inner = 0; inner < 120 && decoys.length < 3; inner += 1) {
        const candidateName = pickRandom(state.roster);
        if (!candidateName || usedNames.has(candidateName)) continue;
        usedNames.add(candidateName);
        const candidate = await getPokemon(candidateName);
        if (!candidate || pokemonHasAbility(candidate, chosenAbility.name)) continue;
        decoys.push(candidate);
      }
      if (decoys.length < 3) continue;

      const description = await getAbilityDescription(chosenAbility);
      const options = shuffle([answer, ...decoys]);
      const correctIndex = options.findIndex((entry) => entry.id === answer.id);
      if (correctIndex < 0) continue;

      nextRound = {
        abilityName: chosenAbility.name,
        description,
        options,
        correctIndex,
        isHidden: chosenAbility.isHidden,
      };
      break;
    }

    if (!nextRound) {
      throw new Error("Could not create an Ability Link round.");
    }

    if (requestId !== state.requestId) return;
    state.round = nextRound;
    state.feedback = DEFAULT_FEEDBACK;
    track("ability-link:round", {
      ability: nextRound.abilityName,
      options: nextRound.options.map((entry) => entry.rawName),
    });
  } catch (error) {
    if (requestId !== state.requestId) return;
    console.error(error);
    state.round = null;
    state.feedback = "Could not load ability puzzle. Try Next Round.";
    setSafeStatus("Ability Link failed to load a round");
  } finally {
    if (requestId !== state.requestId) return;
    state.busy = false;
    render();
  }
};

const applyChoice = (index) => {
  if (!state.round || state.revealed || state.busy) return;
  const picked = Number(index);
  if (!Number.isInteger(picked) || picked < 0 || picked >= state.round.options.length) return;

  state.rounds += 1;
  state.selectedIndex = picked;
  state.revealed = true;
  const correct = picked === state.round.correctIndex;
  if (correct) {
    state.score += 1;
    state.correct += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.feedback = "Correct. Ability linked.";
  } else {
    state.streak = 0;
    state.feedback = "Incorrect. Check the highlighted answer.";
  }

  const pickedPokemon = state.round.options[picked];
  const correctPokemon = state.round.options[state.round.correctIndex];
  state.history.unshift({
    abilityName: state.round.abilityName,
    pickedName: pickedPokemon?.name || "Unknown",
    correctName: correctPokemon?.name || "Unknown",
    correct,
  });
  state.history = state.history.slice(0, HISTORY_LIMIT);

  track("ability-link:answer", {
    correct,
    ability: state.round.abilityName,
    picked: pickedPokemon?.rawName,
    expected: correctPokemon?.rawName,
  });
  render();
};

const renderOption = (pokemon, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ability-link-option";
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
  media.className = "arcade-media ability-link-media";
  if (pokemon?.sprite) {
    const image = document.createElement("img");
    image.src = pokemon.sprite;
    image.alt = pokemon.name || "Pokemon artwork";
    image.loading = "lazy";
    media.appendChild(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "ability-link-fallback";
    fallback.textContent = "No art";
    media.appendChild(fallback);
  }

  const name = document.createElement("h3");
  name.textContent = pokemon?.name || "Unknown";
  const types = document.createElement("p");
  types.className = "ability-link-types";
  types.textContent = (pokemon?.typeNames || []).map((entry) => capitalize(entry)).join(" / ") || "Unknown typing";

  button.appendChild(media);
  button.appendChild(name);
  button.appendChild(types);
  return button;
};

const renderHistory = (historyNode) => {
  historyNode.innerHTML = "";
  if (!state.history.length) {
    const empty = document.createElement("li");
    empty.className = "ability-link-history-empty";
    empty.textContent = "No rounds yet.";
    historyNode.appendChild(empty);
    return;
  }

  state.history.forEach((entry) => {
    const item = document.createElement("li");
    item.className = entry.correct ? "is-correct" : "is-wrong";
    item.textContent = `${capitalize(entry.abilityName)}: picked ${entry.pickedName}, answer ${entry.correctName}`;
    historyNode.appendChild(item);
  });
};

function render() {
  if (!state.isMounted || !state.root) return;

  const scoreNode = state.root.querySelector("[data-al-score]");
  const roundsNode = state.root.querySelector("[data-al-rounds]");
  const accuracyNode = state.root.querySelector("[data-al-accuracy]");
  const streakNode = state.root.querySelector("[data-al-streak]");
  const bestNode = state.root.querySelector("[data-al-best]");
  const abilityNode = state.root.querySelector("[data-al-ability]");
  const descNode = state.root.querySelector("[data-al-description]");
  const hintNode = state.root.querySelector("[data-al-hidden]");
  const feedbackNode = state.root.querySelector("[data-al-feedback]");
  const optionsNode = state.root.querySelector("[data-al-options]");
  const nextBtn = state.root.querySelector("[data-action='next']");
  const historyNode = state.root.querySelector("[data-al-history]");

  const accuracy = state.rounds ? Math.round((state.correct / state.rounds) * 100) : 0;
  if (scoreNode) scoreNode.textContent = String(state.score);
  if (roundsNode) roundsNode.textContent = String(state.rounds);
  if (accuracyNode) accuracyNode.textContent = `${accuracy}%`;
  if (streakNode) streakNode.textContent = String(state.streak);
  if (bestNode) bestNode.textContent = String(state.bestStreak);

  if (abilityNode) {
    abilityNode.textContent = state.round
      ? `Which Pokemon can have ${capitalize(state.round.abilityName)}?`
      : "Build a round to begin.";
  }
  if (descNode) {
    descNode.textContent = state.round ? state.round.description : "Ability description appears here.";
  }
  if (hintNode) {
    hintNode.hidden = !state.round?.isHidden;
    hintNode.textContent = state.round?.isHidden ? "This one is a hidden ability." : "";
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
      placeholder.className = "ability-link-placeholder";
      placeholder.textContent = "No puzzle available.";
      optionsNode.appendChild(placeholder);
    }
  }

  if (nextBtn) nextBtn.disabled = state.busy;
  if (historyNode) renderHistory(historyNode);
}

const buildLayout = (ctx) => {
  const panel = ctx.shell.createPanel("game-panel ability-link-game");
  panel.innerHTML = `
    <section class="arcade-card ability-link-stats">
      <div class="arcade-metrics">
        <span class="arcade-chip">Score <strong data-al-score>0</strong></span>
        <span class="arcade-chip">Rounds <strong data-al-rounds>0</strong></span>
        <span class="arcade-chip">Accuracy <strong data-al-accuracy>0%</strong></span>
        <span class="arcade-chip">Streak <strong data-al-streak>0</strong></span>
        <span class="arcade-chip">Best <strong data-al-best>0</strong></span>
      </div>
    </section>
    <section class="arcade-card ability-link-board">
      <p class="ability-link-kicker">Ability Recall</p>
      <h2 data-al-ability>Build a round to begin.</h2>
      <p class="ability-link-description" data-al-description>Ability description appears here.</p>
      <p class="ability-link-hidden" data-al-hidden hidden></p>
      <div class="ability-link-options" data-al-options></div>
      <p class="ability-link-feedback" data-al-feedback>${DEFAULT_FEEDBACK}</p>
    </section>
    <section class="arcade-card ability-link-controls">
      <div class="arcade-options">
        <button type="button" class="arcade-btn" data-action="next">Next Round</button>
        <button type="button" class="arcade-btn-ghost" data-action="reset">Reset Score</button>
      </div>
    </section>
    <section class="arcade-card ability-link-history-card">
      <h3>Recent Links</h3>
      <ol class="ability-link-history" data-al-history></ol>
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
        state.feedback = "Could not load puzzle. Try again.";
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
  title: "Ability Link",
  category: "Knowledge",

  async init(ctx) {
    state.ctx = ctx;
    await ensureRoster();
    await ctx.repo.warmup(state.roster.slice(0, 8));
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
