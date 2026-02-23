import { capitalize, clamp, formatId, getStat, pickMany, pickRandom, shuffle } from "../../shared/util.js";

const GAME_ID = "stat-sprint";
const MAX_HISTORY = 10;
const STAT_POOL = [
  { key: "hp", label: "HP" },
  { key: "attack", label: "Attack" },
  { key: "defense", label: "Defense" },
  { key: "special-attack", label: "Sp. Attack" },
  { key: "special-defense", label: "Sp. Defense" },
  { key: "speed", label: "Speed" },
  { key: "base-total", label: "Base Total" },
];

const createDefaultState = () => ({
  score: 0,
  streak: 0,
  bestStreak: 0,
  roundsPlayed: 0,
  loading: false,
  duel: null,
  history: [],
  feedback: {
    tone: "neutral",
    message: "Pick the Pokemon with the higher highlighted stat.",
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
  baseStatTotal: pokemon.baseStatTotal,
  stats: pokemon.stats,
});

const statValue = (pokemon, key) => {
  if (key === "base-total") return Number(pokemon.baseStatTotal) || 0;
  return getStat(pokemon.stats || [], key);
};

const serializeHistory = (history = []) =>
  history.slice(0, MAX_HISTORY).map((entry) => ({
    result: entry.result === "win" ? "win" : "loss",
    statLabel: String(entry.statLabel || ""),
    leftName: String(entry.leftName || ""),
    rightName: String(entry.rightName || ""),
    scoreDelta: Number(entry.scoreDelta) || 0,
  }));

const deserializeDuel = (duel) => {
  if (!duel || typeof duel !== "object") return null;
  if (!duel.left || !duel.right) return null;

  const statKey = String(duel.statKey || "");
  const statLabel = String(duel.statLabel || "Stat");

  const normalizeSide = (side) => ({
    rawName: String(side.rawName || "").toLowerCase(),
    display: String(side.display || capitalize(side.rawName || "")),
    id: Number(side.id) || 0,
    sprite: String(side.sprite || ""),
    typeNames: Array.isArray(side.typeNames)
      ? side.typeNames.slice(0, 2).map((name) => String(name || ""))
      : [],
  });

  return {
    statKey,
    statLabel,
    left: normalizeSide(duel.left),
    right: normalizeSide(duel.right),
    leftValue: Number(duel.leftValue) || 0,
    rightValue: Number(duel.rightValue) || 0,
    resolved: Boolean(duel.resolved),
    selectedSide: duel.selectedSide === "left" || duel.selectedSide === "right" ? duel.selectedSide : "",
    correctSide: duel.correctSide === "left" || duel.correctSide === "right" ? duel.correctSide : "",
  };
};

const ensureRoster = async (ctx) => {
  if (rosterPool.length) return;

  const generations = [1, 2, 3, 4];
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

const buildDuel = async (ctx) => {
  await ensureRoster(ctx);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const picks = pickMany(rosterPool, 2);
    if (picks.length < 2 || picks[0] === picks[1]) continue;

    const pokemon = await Promise.all(
      picks.map((name) =>
        ctx.repo
          .getPokemon(name)
          .then((item) => compactPokemon(item))
          .catch(() => null),
      ),
    );

    if (!pokemon[0] || !pokemon[1]) continue;

    const stat = pickRandom(STAT_POOL);
    if (!stat) continue;

    const leftValue = statValue(pokemon[0], stat.key);
    const rightValue = statValue(pokemon[1], stat.key);

    if (leftValue === rightValue) continue;

    return {
      statKey: stat.key,
      statLabel: stat.label,
      left: pokemon[0],
      right: pokemon[1],
      leftValue,
      rightValue,
      resolved: false,
      selectedSide: "",
      correctSide: leftValue > rightValue ? "left" : "right",
    };
  }

  throw new Error("Unable to build duel");
};

const setFeedback = (tone, message) => {
  state.feedback = { tone, message };
};

const feedbackClass = (tone) => {
  switch (tone) {
    case "success":
      return "stat-sprint-feedback is-success";
    case "warning":
      return "stat-sprint-feedback is-warning";
    case "danger":
      return "stat-sprint-feedback is-danger";
    default:
      return "stat-sprint-feedback";
  }
};

const queueDuel = async () => {
  if (!ctxRef || state.loading) return;
  state.loading = true;
  setFeedback("neutral", "Generating a stat duel...");
  render();

  try {
    state.duel = await buildDuel(ctxRef);
    setFeedback("neutral", `Who wins ${state.duel.statLabel}?`);
  } catch {
    setFeedback("danger", "Could not create a duel right now. Try again.");
  } finally {
    state.loading = false;
    render();
  }
};

const pushHistory = (entry) => {
  state.history = [entry, ...state.history].slice(0, MAX_HISTORY);
};

const resolvePick = (side) => {
  const duel = state.duel;
  if (!duel || duel.resolved) return;
  if (side !== "left" && side !== "right") return;

  duel.selectedSide = side;
  duel.resolved = true;
  state.roundsPlayed += 1;

  const isCorrect = side === duel.correctSide;

  if (isCorrect) {
    const delta = 6 + Math.min(state.streak, 4);
    state.score += delta;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    setFeedback("success", `Correct. ${duel.statLabel}: ${duel.leftValue} vs ${duel.rightValue}. +${delta} points.`);

    pushHistory({
      result: "win",
      statLabel: duel.statLabel,
      leftName: duel.left.display,
      rightName: duel.right.display,
      scoreDelta: delta,
    });

    ctxRef?.track("stat-sprint:correct", {
      score: state.score,
      streak: state.streak,
      stat: duel.statKey,
    });
  } else {
    const delta = -3;
    state.score = clamp(state.score + delta, 0, 999999);
    state.streak = 0;
    setFeedback(
      "danger",
      `Not quite. ${capitalize(duel.correctSide)} had the higher ${duel.statLabel} (${duel.leftValue} vs ${duel.rightValue}).`,
    );

    pushHistory({
      result: "loss",
      statLabel: duel.statLabel,
      leftName: duel.left.display,
      rightName: duel.right.display,
      scoreDelta: delta,
    });

    ctxRef?.track("stat-sprint:wrong", {
      score: state.score,
      stat: duel.statKey,
      picked: side,
      correctSide: duel.correctSide,
    });
  }

  render();
};

const renderDuelCard = (sideKey, pokemon, value, duel) => {
  const selected = duel.selectedSide === sideKey;
  const correct = duel.correctSide === sideKey;
  const showResult = duel.resolved;
  const classes = ["stat-sprint-duelist"];

  if (showResult && correct) classes.push("is-correct");
  if (showResult && selected && !correct) classes.push("is-wrong");

  return `
    <button class="${classes.join(" ")}" type="button" data-action="pick" data-side="${sideKey}" ${duel.resolved || state.loading ? "disabled" : ""}>
      <span class="stat-sprint-media arcade-media">
        <img src="${escapeHtml(pokemon.sprite || "")}" alt="${escapeHtml(pokemon.display)}" loading="lazy" />
      </span>
      <span class="stat-sprint-name">${escapeHtml(pokemon.display)}</span>
      <span class="stat-sprint-id">${escapeHtml(formatId(pokemon.id))}</span>
      <span class="stat-sprint-types">
        ${(pokemon.typeNames || [])
          .map((typeName) => `<span class="arcade-chip">${escapeHtml(capitalize(typeName))}</span>`)
          .join("")}
      </span>
      ${showResult ? `<span class="stat-sprint-value">${duel.statLabel}: ${value}</span>` : '<span class="stat-sprint-value is-hidden">Choose to reveal stat</span>'}
    </button>
  `;
};

const render = () => {
  if (!root) return;

  const duel = state.duel;

  if (!duel) {
    root.innerHTML = `
      <div class="stat-sprint-shell arcade-stack">
        <article class="arcade-card stat-sprint-empty">
          <h3>Stat Sprint</h3>
          <p>No duel loaded yet.</p>
          <button class="arcade-btn" type="button" data-action="new" ${state.loading ? "disabled" : ""}>Start Duel</button>
        </article>
      </div>
    `;
    return;
  }

  const history = state.history.length
    ? state.history
        .map((entry) => {
          return `
            <li>
              <span class="stat-sprint-history-result ${entry.result === "win" ? "is-win" : "is-loss"}">
                ${entry.result === "win" ? "Win" : "Loss"}
              </span>
              <span>${escapeHtml(entry.leftName)} vs ${escapeHtml(entry.rightName)} (${escapeHtml(entry.statLabel)})</span>
              <span>${entry.scoreDelta > 0 ? `+${entry.scoreDelta}` : entry.scoreDelta}</span>
            </li>
          `;
        })
        .join("")
    : '<li class="is-empty">No duels played yet.</li>';

  root.innerHTML = `
    <div class="stat-sprint-shell arcade-stack">
      <article class="arcade-card stat-sprint-head">
        <h3>Stat Sprint</h3>
        <p>Who has the higher <strong>${escapeHtml(duel.statLabel)}</strong>?</p>
        <div class="arcade-metrics">
          <span class="arcade-chip">Score ${state.score}</span>
          <span class="arcade-chip">Streak ${state.streak}</span>
          <span class="arcade-chip">Best ${state.bestStreak}</span>
          <span class="arcade-chip">Rounds ${state.roundsPlayed}</span>
        </div>
        <p class="${feedbackClass(state.feedback.tone)}">${escapeHtml(state.feedback.message)}</p>
      </article>

      <section class="stat-sprint-duel-grid">
        ${renderDuelCard("left", duel.left, duel.leftValue, duel)}
        ${renderDuelCard("right", duel.right, duel.rightValue, duel)}
      </section>

      <section class="arcade-grid">
        <article class="arcade-card">
          <h3>Round Control</h3>
          <p>After you reveal the answer, load the next duel.</p>
          <div class="stat-sprint-actions">
            <button class="arcade-btn" type="button" data-action="new" ${state.loading ? "disabled" : ""}>Next Duel</button>
          </div>
        </article>

        <article class="arcade-card">
          <h3>Recent Results</h3>
          <ul class="stat-sprint-history">${history}</ul>
        </article>
      </section>
    </div>
  `;
};

const onClick = async (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-action]") : null;
  if (!target) return;

  const action = target.getAttribute("data-action");

  if (action === "pick") {
    resolvePick(target.getAttribute("data-side") || "");
    return;
  }

  if (action === "new") {
    await queueDuel();
  }
};

const moduleApi = {
  id: GAME_ID,
  title: "Stat Sprint",
  category: "Puzzle",

  async init(ctx) {
    ctxRef = ctx;
    try {
      await ensureRoster(ctx);
      ctx.track("stat-sprint:init", { rosterSize: rosterPool.length });
    } catch {
      // Safe to lazily load in mount.
    }
  },

  async mount(ctx) {
    ctxRef = ctx;

    root = document.createElement("section");
    root.className = "game-panel stat-sprint";

    abortController = new AbortController();
    root.addEventListener("click", onClick, { signal: abortController.signal });

    ctx.shell.setGameContent(root);
    render();

    if (!state.duel) {
      await queueDuel();
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
        duel: state.duel,
        history: serializeHistory(state.history),
        feedback: {
          tone: state.feedback.tone,
          message: state.feedback.message,
        },
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
      duel: deserializeDuel(data.duel),
      history: serializeHistory(Array.isArray(data.history) ? data.history : []),
      feedback: {
        tone: String(data.feedback?.tone || "neutral"),
        message: String(data.feedback?.message || createDefaultState().feedback.message),
      },
    };
  },
};

export default moduleApi;
