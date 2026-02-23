import { capitalize, clamp, formatId, pickMany, pickRandom, shuffle } from "../../shared/util.js";

const GAME_ID = "silhouette-blitz";
const ROUND_SECONDS = 12;
const MAX_HISTORY = 10;

const createDefaultState = () => ({
  score: 0,
  streak: 0,
  bestStreak: 0,
  roundsPlayed: 0,
  loading: false,
  timeLeft: ROUND_SECONDS,
  round: null,
  history: [],
  feedback: {
    tone: "neutral",
    message: "Identify the silhouette before the timer runs out.",
  },
});

let state = createDefaultState();
let ctxRef = null;
let root = null;
let abortController = null;
let rosterPool = [];
let timerId = null;

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

const serializeHistory = (history = []) =>
  history.slice(0, MAX_HISTORY).map((entry) => ({
    result: entry.result === "win" ? "win" : "loss",
    answer: String(entry.answer || ""),
    selected: String(entry.selected || ""),
    scoreDelta: Number(entry.scoreDelta) || 0,
  }));

const deserializeRound = (round) => {
  if (!round || typeof round !== "object") return null;

  const candidates = Array.isArray(round.candidates)
    ? round.candidates
        .map((candidate) => ({
          rawName: String(candidate.rawName || "").toLowerCase(),
          display: String(candidate.display || capitalize(candidate.rawName || "")),
          id: Number(candidate.id) || 0,
          sprite: String(candidate.sprite || ""),
          typeNames: Array.isArray(candidate.typeNames)
            ? candidate.typeNames.slice(0, 2).map((typeName) => String(typeName || ""))
            : [],
        }))
        .filter((candidate) => candidate.rawName)
    : [];

  if (candidates.length < 2) return null;

  return {
    candidates,
    correctName: String(round.correctName || "").toLowerCase(),
    selectedName: String(round.selectedName || "").toLowerCase(),
    resolved: Boolean(round.resolved),
    timedOut: Boolean(round.timedOut),
  };
};

const ensureRoster = async (ctx) => {
  if (rosterPool.length) return;

  const lists = await Promise.all(
    [1, 2, 3, 4].map((gen) =>
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

const buildRound = async (ctx) => {
  await ensureRoster(ctx);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const picks = pickMany(rosterPool, 4);
    if (picks.length < 4) continue;

    const candidates = await Promise.all(
      picks.map((name) =>
        ctx.repo
          .getPokemon(name)
          .then((pokemon) => compactPokemon(pokemon))
          .catch(() => null),
      ),
    );

    const clean = candidates.filter(Boolean);
    if (clean.length < 4 || clean.some((entry) => !entry.sprite)) continue;

    const correct = pickRandom(clean);
    if (!correct) continue;

    return {
      candidates: clean,
      correctName: correct.rawName,
      selectedName: "",
      resolved: false,
      timedOut: false,
    };
  }

  throw new Error("Unable to build silhouette round");
};

const clearTimer = () => {
  if (!timerId) return;
  clearInterval(timerId);
  timerId = null;
};

const setFeedback = (tone, message) => {
  state.feedback = { tone, message };
};

const pushHistory = (entry) => {
  state.history = [entry, ...state.history].slice(0, MAX_HISTORY);
};

const feedbackClass = (tone) => {
  switch (tone) {
    case "success":
      return "silhouette-blitz-feedback is-success";
    case "warning":
      return "silhouette-blitz-feedback is-warning";
    case "danger":
      return "silhouette-blitz-feedback is-danger";
    default:
      return "silhouette-blitz-feedback";
  }
};

const findCandidate = (name) =>
  state.round?.candidates?.find((candidate) => candidate.rawName === name) || null;

const concludeTimeout = () => {
  if (!state.round || state.round.resolved) return;

  clearTimer();

  state.round.resolved = true;
  state.round.timedOut = true;
  state.roundsPlayed += 1;
  state.streak = 0;
  state.score = clamp(state.score - 2, 0, 999999);

  const answer = findCandidate(state.round.correctName);
  setFeedback("danger", `Time up. It was ${answer?.display || capitalize(state.round.correctName)}.`);

  pushHistory({
    result: "loss",
    answer: state.round.correctName,
    selected: "",
    scoreDelta: -2,
  });

  ctxRef?.track("silhouette-blitz:timeout", {
    score: state.score,
    answer: state.round.correctName,
  });

  render();
};

const startTimer = () => {
  clearTimer();

  if (!state.round || state.round.resolved || state.loading) return;
  if (state.timeLeft <= 0) {
    concludeTimeout();
    return;
  }

  timerId = window.setInterval(() => {
    if (!state.round || state.round.resolved || state.loading) {
      clearTimer();
      return;
    }

    state.timeLeft = Math.max(0, state.timeLeft - 1);

    if (state.timeLeft <= 0) {
      concludeTimeout();
      return;
    }

    render();
  }, 1000);
};

const queueRound = async () => {
  if (!ctxRef || state.loading) return;

  clearTimer();
  state.loading = true;
  setFeedback("neutral", "Preparing a new silhouette...");
  render();

  try {
    state.round = await buildRound(ctxRef);
    state.timeLeft = ROUND_SECONDS;
    setFeedback("neutral", "Pick fast. Timer is live.");
  } catch {
    setFeedback("danger", "Could not create a silhouette round. Try again.");
  } finally {
    state.loading = false;
    render();
    startTimer();
  }
};

const resolveGuess = (name) => {
  if (!state.round || state.round.resolved) return;

  const normalized = String(name || "").toLowerCase();
  const picked = findCandidate(normalized);
  if (!picked) return;

  clearTimer();

  state.round.selectedName = normalized;
  state.round.resolved = true;
  state.roundsPlayed += 1;

  const correct = normalized === state.round.correctName;

  if (correct) {
    const delta = 7 + Math.min(state.streak, 4);
    state.score += delta;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);

    setFeedback("success", `Correct in ${ROUND_SECONDS - state.timeLeft}s. +${delta} points.`);

    pushHistory({
      result: "win",
      answer: normalized,
      selected: normalized,
      scoreDelta: delta,
    });

    ctxRef?.track("silhouette-blitz:correct", {
      score: state.score,
      streak: state.streak,
      timeLeft: state.timeLeft,
    });
  } else {
    const answer = findCandidate(state.round.correctName);
    const delta = -3;
    state.score = clamp(state.score + delta, 0, 999999);
    state.streak = 0;

    setFeedback(
      "danger",
      `Not quite. You picked ${picked.display}; answer was ${answer?.display || capitalize(state.round.correctName)}.`,
    );

    pushHistory({
      result: "loss",
      answer: state.round.correctName,
      selected: normalized,
      scoreDelta: delta,
    });

    ctxRef?.track("silhouette-blitz:wrong", {
      score: state.score,
      picked: normalized,
      answer: state.round.correctName,
      timeLeft: state.timeLeft,
    });
  }

  render();
};

const render = () => {
  if (!root) return;

  const round = state.round;

  if (!round) {
    root.innerHTML = `
      <div class="silhouette-blitz-shell arcade-stack">
        <article class="arcade-card silhouette-blitz-empty">
          <h3>Silhouette Blitz</h3>
          <p>No round loaded yet.</p>
          <button class="arcade-btn" type="button" data-action="new" ${state.loading ? "disabled" : ""}>Start Blitz</button>
        </article>
      </div>
    `;
    return;
  }

  const answer = findCandidate(round.correctName);
  const progress = Math.max(0, Math.min(100, (state.timeLeft / ROUND_SECONDS) * 100));

  const options = round.candidates
    .map((candidate) => {
      const selected = round.selectedName === candidate.rawName;
      const correct = round.correctName === candidate.rawName;
      const classes = ["silhouette-blitz-option"];

      if (round.resolved && correct) classes.push("is-correct");
      if (round.resolved && selected && !correct) classes.push("is-wrong");

      return `
        <button class="${classes.join(" ")}" type="button" data-action="guess" data-name="${escapeHtml(candidate.rawName)}" ${round.resolved || state.loading ? "disabled" : ""}>
          <span>${escapeHtml(candidate.display)}</span>
          <small>${escapeHtml(formatId(candidate.id))}</small>
        </button>
      `;
    })
    .join("");

  const history = state.history.length
    ? state.history
        .map((entry) => {
          return `
            <li>
              <span class="silhouette-blitz-history-result ${entry.result === "win" ? "is-win" : "is-loss"}">
                ${entry.result === "win" ? "Win" : "Loss"}
              </span>
              <span>${escapeHtml(capitalize(entry.answer))}</span>
              <span>${entry.scoreDelta > 0 ? `+${entry.scoreDelta}` : entry.scoreDelta}</span>
            </li>
          `;
        })
        .join("")
    : '<li class="is-empty">No rounds completed yet.</li>';

  root.innerHTML = `
    <div class="silhouette-blitz-shell arcade-stack">
      <article class="arcade-card silhouette-blitz-head">
        <h3>Silhouette Blitz</h3>
        <div class="arcade-metrics">
          <span class="arcade-chip">Score ${state.score}</span>
          <span class="arcade-chip">Streak ${state.streak}</span>
          <span class="arcade-chip">Best ${state.bestStreak}</span>
          <span class="arcade-chip">Rounds ${state.roundsPlayed}</span>
        </div>
        <div class="silhouette-blitz-timer-wrap">
          <div class="silhouette-blitz-timer-label">
            <span>Time</span>
            <strong>${state.timeLeft}s</strong>
          </div>
          <div class="silhouette-blitz-timer-track">
            <span class="silhouette-blitz-timer-fill" style="width: ${progress}%"></span>
          </div>
        </div>
        <p class="${feedbackClass(state.feedback.tone)}">${escapeHtml(state.feedback.message)}</p>
      </article>

      <section class="silhouette-blitz-stage arcade-grid">
        <article class="arcade-card silhouette-blitz-figure">
          <div class="arcade-media silhouette">
            <img src="${escapeHtml(answer?.sprite || "")}" alt="Silhouette" loading="lazy" />
          </div>
          ${round.resolved ? `<h4>${escapeHtml(answer?.display || capitalize(round.correctName))}</h4>` : '<h4>Who is this Pokemon?</h4>'}
          ${round.resolved ? `<p>${escapeHtml(formatId(answer?.id || 0))}</p>` : ""}
        </article>

        <article class="arcade-card silhouette-blitz-options-wrap">
          <h4>Choices</h4>
          <div class="silhouette-blitz-options">${options}</div>
          <div class="silhouette-blitz-actions">
            <button class="arcade-btn" type="button" data-action="new" ${state.loading ? "disabled" : ""}>Next Silhouette</button>
          </div>
        </article>
      </section>

      <article class="arcade-card">
        <h3>Recent Blitz Rounds</h3>
        <ul class="silhouette-blitz-history">${history}</ul>
      </article>
    </div>
  `;
};

const onClick = async (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-action]") : null;
  if (!target) return;

  const action = target.getAttribute("data-action");

  if (action === "guess") {
    resolveGuess(target.getAttribute("data-name") || "");
    return;
  }

  if (action === "new") {
    await queueRound();
  }
};

const moduleApi = {
  id: GAME_ID,
  title: "Silhouette Blitz",
  category: "Reflex",

  async init(ctx) {
    ctxRef = ctx;
    try {
      await ensureRoster(ctx);
      ctx.track("silhouette-blitz:init", { rosterSize: rosterPool.length });
    } catch {
      // Safe to lazily load later.
    }
  },

  async mount(ctx) {
    ctxRef = ctx;

    root = document.createElement("section");
    root.className = "game-panel silhouette-blitz";

    abortController = new AbortController();
    root.addEventListener("click", onClick, { signal: abortController.signal });

    ctx.shell.setGameContent(root);
    render();

    if (!state.round) {
      await queueRound();
    } else if (!state.round.resolved) {
      startTimer();
    }
  },

  unmount() {
    clearTimer();
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
        timeLeft: state.timeLeft,
        round: state.round,
        history: serializeHistory(state.history),
        feedback: {
          tone: state.feedback.tone,
          message: state.feedback.message,
        },
      },
    };
  },

  restoreSnapshot(snapshot) {
    clearTimer();
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
      timeLeft: Math.max(0, Math.min(ROUND_SECONDS, Number(data.timeLeft) || ROUND_SECONDS)),
      round: deserializeRound(data.round),
      history: serializeHistory(Array.isArray(data.history) ? data.history : []),
      feedback: {
        tone: String(data.feedback?.tone || "neutral"),
        message: String(data.feedback?.message || createDefaultState().feedback.message),
      },
    };

    if (!state.round) {
      state.timeLeft = ROUND_SECONDS;
    }
  },
};

export default moduleApi;
