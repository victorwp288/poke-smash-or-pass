import { capitalize, clamp, formatId, pickRandom, shuffle } from "../../shared/util.js";

const GAME_ID = "evo-relay";
const MAX_HISTORY = 8;
const MIN_CHAIN_LEN = 3;
const MAX_CHAIN_LEN = 4;

const createDefaultState = () => ({
  score: 0,
  streak: 0,
  bestStreak: 0,
  roundsPlayed: 0,
  loading: false,
  round: null,
  history: [],
  feedback: {
    tone: "neutral",
    message: "Build a relay by placing each stage in the correct evolution order.",
  },
});

let state = createDefaultState();
let ctxRef = null;
let root = null;
let abortController = null;
let rosterPool = [];

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const compactPokemon = (pokemon) => ({
  rawName: pokemon.rawName,
  display: pokemon.name,
  id: pokemon.id,
  sprite: pokemon.sprite,
  typeNames: (pokemon.typeNames || []).slice(0, 2),
});

const normalizeChainNames = (names = []) => {
  const seen = new Set();
  const ordered = [];
  names.forEach((entry) => {
    const normalized = String(entry || "").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    ordered.push(normalized);
  });
  return ordered;
};

const serializeHistory = (history = []) =>
  history.slice(0, MAX_HISTORY).map((entry) => ({
    result: entry.result === "win" ? "win" : "loss",
    scoreDelta: Number(entry.scoreDelta) || 0,
    answer: Array.isArray(entry.answer) ? entry.answer.slice(0, MAX_CHAIN_LEN) : [],
  }));

const deserializeRound = (round) => {
  if (!round || typeof round !== "object") return null;
  const entries = Array.isArray(round.entries)
    ? round.entries
        .map((entry) => ({
          rawName: String(entry.rawName || "").toLowerCase(),
          display: String(entry.display || capitalize(entry.rawName || "")),
          id: Number(entry.id) || 0,
          sprite: String(entry.sprite || ""),
          typeNames: Array.isArray(entry.typeNames)
            ? entry.typeNames.slice(0, 2).map((name) => String(name || ""))
            : [],
        }))
        .filter((entry) => entry.rawName)
    : [];

  const answer = Array.isArray(round.answer)
    ? round.answer.map((name) => String(name || "").toLowerCase()).filter(Boolean)
    : [];
  const shuffled = Array.isArray(round.shuffled)
    ? round.shuffled.map((name) => String(name || "").toLowerCase()).filter(Boolean)
    : [];
  const selected = Array.isArray(round.selected)
    ? round.selected.map((name) => String(name || "").toLowerCase()).filter(Boolean)
    : [];

  if (entries.length < MIN_CHAIN_LEN || answer.length !== entries.length) return null;

  return {
    entries,
    answer,
    shuffled: shuffled.length === entries.length ? shuffled : shuffle(answer),
    selected: selected.slice(0, entries.length),
    resolved: Boolean(round.resolved),
    wasCorrect: Boolean(round.wasCorrect),
  };
};

const ensureRoster = async (ctx) => {
  if (rosterPool.length) return;
  const generations = [1, 2, 3];
  const lists = await Promise.all(
    generations.map((gen) =>
      ctx.repo
        .getGenerationRoster(gen)
        .then((names) => names || [])
        .catch(() => []),
    ),
  );

  const unique = new Set();
  lists.flat().forEach((name) => {
    const normalized = String(name || "").trim().toLowerCase();
    if (!normalized) return;
    unique.add(normalized);
  });

  rosterPool = shuffle([...unique]);
};

const buildRelayRound = async (ctx) => {
  await ensureRoster(ctx);

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const species = pickRandom(rosterPool);
    if (!species) break;

    const chain = normalizeChainNames(await ctx.repo.getEvolutionChain(species));
    if (chain.length < MIN_CHAIN_LEN) continue;

    const trimmed = chain.slice(0, Math.min(chain.length, MAX_CHAIN_LEN));
    if (trimmed.length < MIN_CHAIN_LEN) continue;

    const pokemonList = await Promise.all(
      trimmed.map((name) =>
        ctx.repo
          .getPokemon(name)
          .then((pokemon) => compactPokemon(pokemon))
          .catch(() => null),
      ),
    );

    const entries = pokemonList.filter(Boolean);
    if (entries.length !== trimmed.length) continue;

    const answer = entries.map((entry) => entry.rawName);

    return {
      entries,
      answer,
      shuffled: shuffle(answer),
      selected: [],
      resolved: false,
      wasCorrect: false,
    };
  }

  throw new Error("Unable to create evolution relay round");
};

const findEntry = (rawName) =>
  state.round?.entries?.find((entry) => entry.rawName === rawName) || null;

const recordHistory = (item) => {
  state.history = [item, ...state.history].slice(0, MAX_HISTORY);
};

const setFeedback = (tone, message) => {
  state.feedback = {
    tone,
    message,
  };
};

const setLoading = (value) => {
  state.loading = Boolean(value);
  render();
};

const queueNewRound = async () => {
  if (!ctxRef || state.loading) return;
  setLoading(true);
  setFeedback("neutral", "Scanning the dex for a fresh relay...");

  try {
    state.round = await buildRelayRound(ctxRef);
    setFeedback("neutral", "Tap Pokemon in order from first stage to final stage.");
  } catch {
    setFeedback("danger", "Could not build a relay right now. Try again.");
  } finally {
    setLoading(false);
  }
};

const scoreRelay = () => {
  if (!state.round || state.round.resolved) return;

  const needed = state.round.answer.length;
  if (state.round.selected.length !== needed) {
    setFeedback("warning", `Fill all ${needed} slots before submitting.`);
    render();
    return;
  }

  const isCorrect = state.round.answer.every((name, index) => name === state.round.selected[index]);
  state.round.resolved = true;
  state.round.wasCorrect = isCorrect;

  state.roundsPlayed += 1;

  if (isCorrect) {
    const bonus = Math.min(state.streak, 5) * 2;
    const delta = 10 + bonus;
    state.score += delta;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);

    setFeedback("success", `Perfect relay. +${delta} points.`);
    recordHistory({
      result: "win",
      scoreDelta: delta,
      answer: state.round.answer,
    });

    ctxRef?.track("evo-relay:correct", {
      score: state.score,
      streak: state.streak,
      chain: state.round.answer,
    });
  } else {
    const delta = -4;
    state.score = clamp(state.score + delta, 0, 999999);
    state.streak = 0;

    setFeedback(
      "danger",
      `Missed. Correct order: ${state.round.answer.map((name) => capitalize(name)).join(" -> ")}.`,
    );
    recordHistory({
      result: "loss",
      scoreDelta: delta,
      answer: state.round.answer,
    });

    ctxRef?.track("evo-relay:wrong", {
      score: state.score,
      chain: state.round.answer,
      submitted: state.round.selected,
    });
  }

  render();
};

const pickName = (rawName) => {
  if (!state.round || state.round.resolved) return;
  if (!state.round.answer.includes(rawName)) return;
  if (state.round.selected.includes(rawName)) return;

  if (state.round.selected.length >= state.round.answer.length) return;

  state.round.selected.push(rawName);
  setFeedback("neutral", "Keep going. Submit when all slots are filled.");
  render();
};

const removeName = (rawName) => {
  if (!state.round || state.round.resolved) return;
  state.round.selected = state.round.selected.filter((name) => name !== rawName);
  render();
};

const clearSelection = () => {
  if (!state.round || state.round.resolved) return;
  state.round.selected = [];
  setFeedback("neutral", "Selection cleared. Build the relay again.");
  render();
};

const feedbackClass = (tone) => {
  switch (tone) {
    case "success":
      return "evo-relay-feedback is-success";
    case "warning":
      return "evo-relay-feedback is-warning";
    case "danger":
      return "evo-relay-feedback is-danger";
    default:
      return "evo-relay-feedback";
  }
};

const render = () => {
  if (!root) return;

  const round = state.round;

  if (!round) {
    root.innerHTML = `
      <div class="evo-relay-shell arcade-stack">
        <div class="arcade-card evo-relay-empty">
          <p>Loading your first relay...</p>
          <button class="arcade-btn" type="button" data-action="new" ${state.loading ? "disabled" : ""}>
            Build Relay
          </button>
        </div>
      </div>
    `;
    return;
  }

  const selectedSlots = round.answer
    .map((_, index) => {
      const name = round.selected[index];
      if (!name) {
        return `
          <li class="evo-relay-slot is-empty">
            <span class="evo-relay-slot-index">${index + 1}</span>
            <span>Open slot</span>
          </li>
        `;
      }

      const entry = findEntry(name);
      return `
        <li class="evo-relay-slot">
          <button class="evo-relay-selected" type="button" data-action="remove" data-name="${escapeHtml(name)}" ${round.resolved ? "disabled" : ""}>
            <span class="evo-relay-slot-index">${index + 1}</span>
            <span>${escapeHtml(entry?.display || capitalize(name))}</span>
          </button>
        </li>
      `;
    })
    .join("");

  const remaining = round.shuffled.filter((name) => !round.selected.includes(name));

  const options = remaining
    .map((name) => {
      const entry = findEntry(name);
      return `
        <button class="evo-relay-option" type="button" data-action="pick" data-name="${escapeHtml(name)}" ${round.resolved ? "disabled" : ""}>
          <span class="evo-relay-option-media">
            <img src="${escapeHtml(entry?.sprite || "")}" alt="${escapeHtml(entry?.display || capitalize(name))}" loading="lazy" />
          </span>
          <span class="evo-relay-option-meta">
            <strong>${escapeHtml(entry?.display || capitalize(name))}</strong>
            <small>${escapeHtml(formatId(entry?.id || 0))}</small>
          </span>
        </button>
      `;
    })
    .join("");

  const answerTrail = round.answer
    .map((name) => {
      const entry = findEntry(name);
      return `<span class="arcade-chip">${escapeHtml(entry?.display || capitalize(name))}</span>`;
    })
    .join("");

  const history = state.history.length
    ? state.history
        .map((entry) => {
          const text = entry.answer.map((name) => capitalize(name)).join(" -> ");
          return `
            <li>
              <span class="evo-relay-history-result ${entry.result === "win" ? "is-win" : "is-loss"}">
                ${entry.result === "win" ? "Win" : "Loss"}
              </span>
              <span>${escapeHtml(text)}</span>
              <span>${entry.scoreDelta > 0 ? `+${entry.scoreDelta}` : entry.scoreDelta}</span>
            </li>
          `;
        })
        .join("")
    : '<li class="is-empty">No relays scored yet.</li>';

  root.innerHTML = `
    <div class="evo-relay-shell arcade-stack">
      <div class="evo-relay-top arcade-grid">
        <article class="arcade-card evo-relay-card">
          <h3>Relay Board</h3>
          <p>Click Pokemon to fill each stage in evolution order.</p>
          <ul class="evo-relay-slots">${selectedSlots}</ul>
          <div class="evo-relay-actions">
            <button class="arcade-btn" type="button" data-action="submit" ${round.resolved || state.loading ? "disabled" : ""}>Submit Relay</button>
            <button class="arcade-btn-ghost" type="button" data-action="clear" ${round.resolved || !round.selected.length ? "disabled" : ""}>Clear</button>
            <button class="arcade-btn-ghost" type="button" data-action="new" ${state.loading ? "disabled" : ""}>New Relay</button>
          </div>
          <p class="${feedbackClass(state.feedback.tone)}">${escapeHtml(state.feedback.message)}</p>
          ${round.resolved ? `<div class="evo-relay-answer"><h4>Correct Order</h4><div class="arcade-metrics">${answerTrail}</div></div>` : ""}
        </article>

        <article class="arcade-card evo-relay-card">
          <h3>Pokemon Pool</h3>
          <p>Use each Pokemon once.</p>
          <div class="evo-relay-options">${options || '<p class="evo-relay-none">All slots filled. Submit relay.</p>'}</div>
        </article>
      </div>

      <div class="evo-relay-bottom arcade-grid">
        <article class="arcade-card">
          <h3>Scoreboard</h3>
          <div class="arcade-metrics">
            <span class="arcade-chip">Score ${state.score}</span>
            <span class="arcade-chip">Streak ${state.streak}</span>
            <span class="arcade-chip">Best ${state.bestStreak}</span>
            <span class="arcade-chip">Rounds ${state.roundsPlayed}</span>
          </div>
        </article>

        <article class="arcade-card">
          <h3>Recent Relays</h3>
          <ul class="evo-relay-history">${history}</ul>
        </article>
      </div>
    </div>
  `;
};

const onClick = async (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-action]") : null;
  if (!target) return;

  const action = target.getAttribute("data-action");
  const name = target.getAttribute("data-name") || "";

  if (action === "pick") {
    pickName(name);
    return;
  }

  if (action === "remove") {
    removeName(name);
    return;
  }

  if (action === "clear") {
    clearSelection();
    return;
  }

  if (action === "submit") {
    scoreRelay();
    return;
  }

  if (action === "new") {
    await queueNewRound();
  }
};

const moduleApi = {
  id: GAME_ID,
  title: "Evolution Relay",
  category: "Puzzle",

  async init(ctx) {
    ctxRef = ctx;
    try {
      await ensureRoster(ctx);
      ctx.track("evo-relay:init", { rosterSize: rosterPool.length });
    } catch {
      // Roster can also be loaded lazily from mount/new round.
    }
  },

  async mount(ctx) {
    ctxRef = ctx;
    root = document.createElement("section");
    root.className = "game-panel evo-relay";

    abortController = new AbortController();
    root.addEventListener("click", onClick, { signal: abortController.signal });

    ctx.shell.setGameContent(root);
    render();

    if (!state.round) {
      await queueNewRound();
    }
  },

  unmount() {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    root = null;
  },

  getSnapshot() {
    return {
      data: {
        score: state.score,
        streak: state.streak,
        bestStreak: state.bestStreak,
        roundsPlayed: state.roundsPlayed,
        history: serializeHistory(state.history),
        feedback: {
          tone: state.feedback.tone,
          message: state.feedback.message,
        },
        round: state.round,
      },
    };
  },

  restoreSnapshot(snapshot) {
    const data = snapshot?.data;
    if (!data || typeof data !== "object") {
      state = createDefaultState();
      return;
    }

    state = {
      ...createDefaultState(),
      score: Math.max(0, Number(data.score) || 0),
      streak: Math.max(0, Number(data.streak) || 0),
      bestStreak: Math.max(0, Number(data.bestStreak) || 0),
      roundsPlayed: Math.max(0, Number(data.roundsPlayed) || 0),
      history: serializeHistory(Array.isArray(data.history) ? data.history : []),
      feedback: {
        tone: String(data.feedback?.tone || "neutral"),
        message: String(data.feedback?.message || createDefaultState().feedback.message),
      },
      round: deserializeRound(data.round),
    };
  },
};

export default moduleApi;
