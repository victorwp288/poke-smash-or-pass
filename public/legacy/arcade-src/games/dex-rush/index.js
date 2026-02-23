import { capitalize } from "../../shared/util.js";

const MODULE_ID = "dex-rush";
const ROSTER_GENS = [1, 2, 3, 4, 5];
const FALLBACK_NAMES = ["bulbasaur", "chikorita", "treecko", "piplup", "snivy", "pikachu"];
const RUSH_DURATION_MS = 60000;
const HISTORY_LIMIT = 10;
const DEFAULT_FEEDBACK = "Start a rush, then call higher or lower.";

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
  streak: 0,
  bestStreak: 0,
  round: null,
  revealed: false,
  guess: "",
  feedback: DEFAULT_FEEDBACK,
  history: [],
  playing: false,
  busy: false,
  remainingMs: RUSH_DURATION_MS,
  timerEndsAt: 0,
  timerId: null,
  clickHandler: null,
};

const unique = (items) => Array.from(new Set((items || []).filter(Boolean)));

const rand = () => (state.ctx?.rng?.random ? state.ctx.rng.random() : Math.random());

const pickRandom = (items) => {
  if (!items?.length) return null;
  return items[Math.floor(rand() * items.length)] || null;
};

const formatTimer = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
    currentName: state.round.current.rawName,
    nextName: state.round.next.rawName,
  };
};

const stopTimer = () => {
  if (state.timerId) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
  state.timerEndsAt = 0;
};

const snapshotRemainingMs = () => {
  if (!state.playing || !state.timerEndsAt) return state.remainingMs;
  return Math.max(0, state.timerEndsAt - Date.now());
};

const renderTimerOnly = () => {
  if (!state.isMounted || !state.root) return;
  const timerNode = state.root.querySelector("[data-dr-timer]");
  if (timerNode) timerNode.textContent = formatTimer(snapshotRemainingMs());
};

const finishRush = () => {
  if (!state.playing) return;
  state.remainingMs = 0;
  state.playing = false;
  stopTimer();
  state.feedback = `Time. Final score ${state.score}/${state.rounds}.`;
  track("dex-rush:finish", {
    score: state.score,
    rounds: state.rounds,
    bestStreak: state.bestStreak,
  });
  render();
};

const startTimer = () => {
  stopTimer();
  if (!state.playing) return;
  state.timerEndsAt = Date.now() + state.remainingMs;
  state.timerId = window.setInterval(() => {
    state.remainingMs = Math.max(0, state.timerEndsAt - Date.now());
    renderTimerOnly();
    if (state.remainingMs <= 0) {
      finishRush();
    }
  }, 250);
};

const createPair = async (currentPokemon = null) => {
  await ensureRoster();
  const requestId = state.requestId;
  let current = currentPokemon;
  if (!current) {
    const firstName = pickRandom(state.roster);
    current = await getPokemon(firstName);
  }
  if (!current) throw new Error("Unable to create current Pokemon.");

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (requestId !== state.requestId) return null;
    const nextName = pickRandom(state.roster);
    const next = await getPokemon(nextName);
    if (!next || next.id === current.id) continue;
    return { current, next };
  }
  throw new Error("Unable to create next Pokemon.");
};

const resetStats = () => {
  state.score = 0;
  state.rounds = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.history = [];
  state.round = null;
  state.revealed = false;
  state.guess = "";
  state.playing = false;
  state.busy = false;
  state.remainingMs = RUSH_DURATION_MS;
  state.feedback = DEFAULT_FEEDBACK;
  stopTimer();
};

const startRush = async () => {
  const requestId = ++state.requestId;
  state.busy = true;
  state.feedback = "Loading rush...";
  render();

  try {
    resetStats();
    state.busy = true;
    const pair = await createPair();
    if (!pair || requestId !== state.requestId) return;
    state.round = pair;
    state.playing = true;
    state.remainingMs = RUSH_DURATION_MS;
    state.feedback = "Will the next Pokemon have a higher or lower Dex number?";
    startTimer();
    track("dex-rush:start", {});
  } catch (error) {
    if (requestId !== state.requestId) return;
    console.error(error);
    state.feedback = "Could not start rush. Try again.";
    setSafeStatus("Dex Rush failed to start");
  } finally {
    if (requestId !== state.requestId) return;
    state.busy = false;
    render();
  }
};

const continueRush = async () => {
  if (!state.playing || !state.round) return;
  const requestId = ++state.requestId;
  state.busy = true;
  state.feedback = "Loading next duel...";
  render();

  try {
    const pair = await createPair(state.round.next);
    if (!pair || requestId !== state.requestId) return;
    state.round = pair;
    state.revealed = false;
    state.guess = "";
    state.feedback = "Will the next Pokemon have a higher or lower Dex number?";
  } catch (error) {
    if (requestId !== state.requestId) return;
    console.error(error);
    state.feedback = "Could not load next duel.";
    setSafeStatus("Dex Rush failed to load next duel");
  } finally {
    if (requestId !== state.requestId) return;
    state.busy = false;
    render();
  }
};

const makeGuess = (direction) => {
  if (!state.playing || state.busy || state.revealed || !state.round) return;
  if (direction !== "higher" && direction !== "lower") return;

  const currentDex = Number(state.round.current.id) || 0;
  const nextDex = Number(state.round.next.id) || 0;
  const expected = nextDex > currentDex ? "higher" : "lower";
  const correct = direction === expected;

  state.rounds += 1;
  state.revealed = true;
  state.guess = direction;

  if (correct) {
    state.score += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.feedback = `Correct. ${state.round.next.name} is #${state.round.next.id}.`;
  } else {
    state.streak = 0;
    state.feedback = `Missed. ${state.round.next.name} is #${state.round.next.id}.`;
  }

  state.history.unshift({
    guess: direction,
    expected,
    correct,
    name: state.round.next.name,
    dex: state.round.next.id,
  });
  state.history = state.history.slice(0, HISTORY_LIMIT);

  track("dex-rush:guess", {
    correct,
    guess: direction,
    expected,
    currentDex,
    nextDex,
  });
  render();
};

const renderPokemonCard = (pokemon, options = {}) => {
  const { reveal = true } = options;
  const wrapper = document.createElement("article");
  wrapper.className = "dex-rush-card";

  const media = document.createElement("div");
  media.className = `arcade-media dex-rush-media${reveal ? "" : " is-hidden"}`;
  if (pokemon?.sprite) {
    const image = document.createElement("img");
    image.src = pokemon.sprite;
    image.alt = reveal ? pokemon.name : "Hidden Pokemon";
    image.loading = "lazy";
    media.appendChild(image);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "dex-rush-fallback";
    fallback.textContent = "No art";
    media.appendChild(fallback);
  }

  const title = document.createElement("h3");
  title.textContent = reveal ? pokemon?.name || "Unknown" : "Hidden";
  const dex = document.createElement("p");
  dex.className = "dex-rush-dex";
  dex.textContent = reveal ? `#${String(pokemon?.id || "?").padStart(4, "0")}` : "#????";

  const types = document.createElement("p");
  types.className = "dex-rush-types";
  types.textContent = reveal
    ? (pokemon?.typeNames || []).map((entry) => capitalize(entry)).join(" / ") || "Unknown typing"
    : "Dex challenge";

  wrapper.appendChild(media);
  wrapper.appendChild(title);
  wrapper.appendChild(dex);
  wrapper.appendChild(types);
  return wrapper;
};

const renderHistory = (historyNode) => {
  historyNode.innerHTML = "";
  if (!state.history.length) {
    const empty = document.createElement("li");
    empty.className = "dex-rush-history-empty";
    empty.textContent = "No calls yet.";
    historyNode.appendChild(empty);
    return;
  }

  state.history.forEach((entry) => {
    const item = document.createElement("li");
    item.className = entry.correct ? "is-correct" : "is-wrong";
    item.textContent = `${entry.correct ? "Hit" : "Miss"}: ${entry.name} #${String(entry.dex).padStart(4, "0")} (${entry.expected})`;
    historyNode.appendChild(item);
  });
};

function render() {
  if (!state.isMounted || !state.root) return;

  const timerNode = state.root.querySelector("[data-dr-timer]");
  const scoreNode = state.root.querySelector("[data-dr-score]");
  const roundsNode = state.root.querySelector("[data-dr-rounds]");
  const streakNode = state.root.querySelector("[data-dr-streak]");
  const bestNode = state.root.querySelector("[data-dr-best]");
  const boardNode = state.root.querySelector("[data-dr-board]");
  const feedbackNode = state.root.querySelector("[data-dr-feedback]");
  const higherBtn = state.root.querySelector("[data-action='higher']");
  const lowerBtn = state.root.querySelector("[data-action='lower']");
  const continueBtn = state.root.querySelector("[data-action='continue']");
  const startBtn = state.root.querySelector("[data-action='start']");
  const restartBtn = state.root.querySelector("[data-action='restart']");
  const historyNode = state.root.querySelector("[data-dr-history]");

  if (timerNode) timerNode.textContent = formatTimer(snapshotRemainingMs());
  if (scoreNode) scoreNode.textContent = String(state.score);
  if (roundsNode) roundsNode.textContent = String(state.rounds);
  if (streakNode) streakNode.textContent = String(state.streak);
  if (bestNode) bestNode.textContent = String(state.bestStreak);
  if (feedbackNode) {
    feedbackNode.textContent = state.feedback;
    feedbackNode.classList.toggle("is-busy", state.busy);
  }

  if (boardNode) {
    boardNode.innerHTML = "";
    if (state.round) {
      const currentCard = renderPokemonCard(state.round.current, { reveal: true });
      const nextCard = renderPokemonCard(state.round.next, { reveal: state.revealed });
      currentCard.dataset.role = "current";
      nextCard.dataset.role = "next";
      boardNode.appendChild(currentCard);
      boardNode.appendChild(nextCard);
    } else {
      const placeholder = document.createElement("p");
      placeholder.className = "dex-rush-placeholder";
      placeholder.textContent = "Press Start Rush to begin.";
      boardNode.appendChild(placeholder);
    }
  }

  const canGuess = state.playing && !state.revealed && !state.busy && !!state.round;
  if (higherBtn) higherBtn.disabled = !canGuess;
  if (lowerBtn) lowerBtn.disabled = !canGuess;
  if (continueBtn) continueBtn.disabled = !(state.playing && state.revealed && !state.busy);
  if (startBtn) startBtn.disabled = state.playing || state.busy;
  if (restartBtn) restartBtn.disabled = state.busy;

  if (historyNode) renderHistory(historyNode);
}

const buildLayout = (ctx) => {
  const panel = ctx.shell.createPanel("game-panel dex-rush-game");
  panel.innerHTML = `
    <section class="arcade-card dex-rush-stats">
      <div class="arcade-metrics">
        <span class="arcade-chip">Timer <strong data-dr-timer>01:00</strong></span>
        <span class="arcade-chip">Score <strong data-dr-score>0</strong></span>
        <span class="arcade-chip">Rounds <strong data-dr-rounds>0</strong></span>
        <span class="arcade-chip">Streak <strong data-dr-streak>0</strong></span>
        <span class="arcade-chip">Best <strong data-dr-best>0</strong></span>
      </div>
    </section>
    <section class="arcade-card dex-rush-board-wrap">
      <p class="dex-rush-kicker">Dex Number Sprint</p>
      <h2>Will the next Pokemon be higher or lower?</h2>
      <div class="dex-rush-board" data-dr-board></div>
      <div class="arcade-options dex-rush-guess-controls">
        <button type="button" class="arcade-btn" data-action="higher">Higher</button>
        <button type="button" class="arcade-btn-ghost" data-action="lower">Lower</button>
      </div>
      <p class="dex-rush-feedback" data-dr-feedback>${DEFAULT_FEEDBACK}</p>
    </section>
    <section class="arcade-card dex-rush-controls">
      <div class="arcade-options">
        <button type="button" class="arcade-btn" data-action="start">Start Rush</button>
        <button type="button" class="arcade-btn-ghost" data-action="continue">Continue</button>
        <button type="button" class="arcade-btn-danger" data-action="restart">Restart</button>
      </div>
    </section>
    <section class="arcade-card dex-rush-history-card">
      <h3>Recent Calls</h3>
      <ol class="dex-rush-history" data-dr-history></ol>
    </section>
  `;
  return panel;
};

const hydrateRound = async (rawRound) => {
  if (!rawRound || !rawRound.currentName || !rawRound.nextName) return null;
  const [current, next] = await Promise.all([
    getPokemon(rawRound.currentName),
    getPokemon(rawRound.nextName),
  ]);
  if (!current || !next || current.id === next.id) return null;
  return { current, next };
};

const restoreFromPendingSnapshot = async () => {
  const snapshot = state.pendingSnapshot;
  state.pendingSnapshot = null;
  if (!snapshot) {
    resetStats();
    render();
    return;
  }

  state.score = Number(snapshot.score) || 0;
  state.rounds = Number(snapshot.rounds) || 0;
  state.streak = Number(snapshot.streak) || 0;
  state.bestStreak = Number(snapshot.bestStreak) || 0;
  state.feedback = typeof snapshot.feedback === "string" ? snapshot.feedback : DEFAULT_FEEDBACK;
  state.revealed = Boolean(snapshot.revealed);
  state.guess = typeof snapshot.guess === "string" ? snapshot.guess : "";
  state.history = Array.isArray(snapshot.history) ? snapshot.history.slice(0, HISTORY_LIMIT) : [];

  const incomingRemaining = Number(snapshot.remainingMs);
  state.remainingMs = Number.isFinite(incomingRemaining)
    ? Math.max(0, Math.min(RUSH_DURATION_MS, incomingRemaining))
    : RUSH_DURATION_MS;

  let restoredRound = null;
  try {
    restoredRound = await hydrateRound(snapshot.round);
  } catch (error) {
    console.error(error);
    restoredRound = null;
  }
  state.round = restoredRound;
  state.playing = Boolean(snapshot.playing) && state.remainingMs > 0 && !!state.round;

  if (state.playing) {
    startTimer();
    track("dex-rush:resume", {
      remainingMs: state.remainingMs,
      score: state.score,
      rounds: state.rounds,
    });
  } else {
    stopTimer();
  }

  render();
};

const wireEvents = () => {
  if (!state.root) return;
  state.clickHandler = (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action === "higher") {
      makeGuess("higher");
      return;
    }
    if (action === "lower") {
      makeGuess("lower");
      return;
    }
    if (action === "continue") {
      continueRush().catch((error) => {
        console.error(error);
        state.feedback = "Could not continue rush.";
        state.busy = false;
        render();
      });
      return;
    }
    if (action === "start") {
      startRush().catch((error) => {
        console.error(error);
        state.feedback = "Could not start rush.";
        state.busy = false;
        render();
      });
      return;
    }
    if (action === "restart") {
      startRush().catch((error) => {
        console.error(error);
        state.feedback = "Could not restart rush.";
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
  title: "Dex Rush",
  category: "Trivia",

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
    stopTimer();
    clearEvents();
    state.root = null;
  },

  getSnapshot() {
    return {
      data: {
        score: state.score,
        rounds: state.rounds,
        streak: state.streak,
        bestStreak: state.bestStreak,
        round: serializeRound(),
        revealed: state.revealed,
        guess: state.guess,
        feedback: state.feedback,
        history: state.history.slice(0, HISTORY_LIMIT),
        playing: state.playing,
        remainingMs: snapshotRemainingMs(),
      },
    };
  },

  restoreSnapshot(snapshot) {
    state.pendingSnapshot = snapshot?.data || null;
  },
};
