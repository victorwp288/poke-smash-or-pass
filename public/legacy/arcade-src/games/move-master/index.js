import {
  TYPE_LIST,
  capitalize,
  clamp,
  formatId,
  pickMany,
  pickRandom,
  shuffle,
  typeEffectiveness,
} from "../../shared/util.js";

const GAME_ID = "move-master";
const MAX_HISTORY = 10;

const createDefaultState = () => ({
  score: 0,
  streak: 0,
  bestStreak: 0,
  roundsPlayed: 0,
  loading: false,
  challenge: null,
  history: [],
  feedback: {
    tone: "neutral",
    message: "Pick the move that delivers the best hit into the target type.",
  },
});

let state = createDefaultState();
let ctxRef = null;
let root = null;
let abortController = null;
let rosterPool = [];

const moveCache = new Map();

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
  moves: (pokemon.moves || []).map((entry) => entry?.move?.name).filter(Boolean),
});

const compactMove = (move) => ({
  name: move.name,
  display: capitalize(move.name),
  typeName: move.type?.name || "normal",
  power: Number(move.power) || 0,
  accuracy: Number(move.accuracy) || 0,
  damageClass: move.damage_class?.name || "status",
});

const serializeHistory = (history = []) =>
  history.slice(0, MAX_HISTORY).map((entry) => ({
    result: entry.result === "win" ? "win" : "loss",
    pokemonName: String(entry.pokemonName || ""),
    defenderType: String(entry.defenderType || ""),
    pickedMove: String(entry.pickedMove || ""),
    correctMove: String(entry.correctMove || ""),
    scoreDelta: Number(entry.scoreDelta) || 0,
  }));

const normalizeOption = (option) => ({
  name: String(option.name || "").toLowerCase(),
  display: String(option.display || capitalize(option.name || "")),
  typeName: String(option.typeName || "normal").toLowerCase(),
  power: Number(option.power) || 0,
  accuracy: Number(option.accuracy) || 0,
  damageClass: String(option.damageClass || "status").toLowerCase(),
});

const deserializeChallenge = (challenge) => {
  if (!challenge || typeof challenge !== "object") return null;

  const options = Array.isArray(challenge.options)
    ? challenge.options.map((option) => normalizeOption(option)).filter((option) => option.name)
    : [];

  if (options.length < 2) return null;

  const pokemon = challenge.pokemon || {};

  return {
    pokemon: {
      rawName: String(pokemon.rawName || "").toLowerCase(),
      display: String(pokemon.display || capitalize(pokemon.rawName || "")),
      id: Number(pokemon.id) || 0,
      sprite: String(pokemon.sprite || ""),
      typeNames: Array.isArray(pokemon.typeNames)
        ? pokemon.typeNames.slice(0, 2).map((name) => String(name || ""))
        : [],
    },
    defenderType: String(challenge.defenderType || "normal").toLowerCase(),
    options,
    correctMove: String(challenge.correctMove || "").toLowerCase(),
    selectedMove: String(challenge.selectedMove || "").toLowerCase(),
    resolved: Boolean(challenge.resolved),
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

const getMoveLite = async (moveName) => {
  const key = String(moveName || "").toLowerCase();
  if (!key) return null;

  if (moveCache.has(key)) {
    return moveCache.get(key);
  }

  try {
    const move = await ctxRef.repo.getMove(key);
    const lite = compactMove(move);
    moveCache.set(key, lite);
    return lite;
  } catch {
    return null;
  }
};

const optionStrength = (option, defenderType) => {
  const multiplier = typeEffectiveness(option.typeName, [defenderType]);
  return multiplier * Math.max(option.power, 1);
};

const buildChallenge = async (ctx) => {
  await ensureRoster(ctx);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const species = pickRandom(rosterPool);
    if (!species) break;

    const pokemon = await ctx.repo.getPokemon(species).then((item) => compactPokemon(item)).catch(() => null);
    if (!pokemon || pokemon.moves.length < 8) continue;

    const sampledMoves = shuffle([...new Set(pokemon.moves)]).slice(0, 20);

    const damaging = [];
    for (const moveName of sampledMoves) {
      const move = await getMoveLite(moveName);
      if (!move || move.power <= 0 || move.damageClass === "status") continue;
      damaging.push(move);
      if (damaging.length >= 8) break;
    }

    if (damaging.length < 4) continue;

    const options = pickMany(damaging, 4).map((option) => normalizeOption(option));
    if (options.length < 4) continue;

    const uniqueTypes = new Set(options.map((option) => option.typeName));
    if (uniqueTypes.size < 2) continue;

    const defenderType = pickRandom(TYPE_LIST) || "normal";

    const ranked = [...options].sort((a, b) => {
      const scoreDiff = optionStrength(b, defenderType) - optionStrength(a, defenderType);
      if (scoreDiff !== 0) return scoreDiff;
      if (b.power !== a.power) return b.power - a.power;
      return b.accuracy - a.accuracy;
    });

    const top = ranked[0];
    const second = ranked[1];
    if (!top || !second) continue;

    const tieOnScore =
      optionStrength(top, defenderType) === optionStrength(second, defenderType) &&
      top.power === second.power &&
      top.accuracy === second.accuracy;
    if (tieOnScore) continue;

    return {
      pokemon: {
        rawName: pokemon.rawName,
        display: pokemon.display,
        id: pokemon.id,
        sprite: pokemon.sprite,
        typeNames: pokemon.typeNames,
      },
      defenderType,
      options: shuffle(options),
      correctMove: top.name,
      selectedMove: "",
      resolved: false,
    };
  }

  throw new Error("Unable to build move challenge");
};

const setFeedback = (tone, message) => {
  state.feedback = { tone, message };
};

const feedbackClass = (tone) => {
  switch (tone) {
    case "success":
      return "move-master-feedback is-success";
    case "warning":
      return "move-master-feedback is-warning";
    case "danger":
      return "move-master-feedback is-danger";
    default:
      return "move-master-feedback";
  }
};

const queueChallenge = async () => {
  if (!ctxRef || state.loading) return;

  state.loading = true;
  setFeedback("neutral", "Pulling moves from the battle archive...");
  render();

  try {
    state.challenge = await buildChallenge(ctxRef);
    setFeedback(
      "neutral",
      `Target type is ${capitalize(state.challenge.defenderType)}. Choose the best move for damage output.`,
    );
  } catch {
    setFeedback("danger", "Could not build a move challenge right now. Try again.");
  } finally {
    state.loading = false;
    render();
  }
};

const pushHistory = (entry) => {
  state.history = [entry, ...state.history].slice(0, MAX_HISTORY);
};

const resolveChoice = (moveName) => {
  const challenge = state.challenge;
  if (!challenge || challenge.resolved) return;

  const normalized = String(moveName || "").toLowerCase();
  const picked = challenge.options.find((option) => option.name === normalized);
  if (!picked) return;

  challenge.selectedMove = normalized;
  challenge.resolved = true;
  state.roundsPlayed += 1;

  const isCorrect = normalized === challenge.correctMove;
  const best = challenge.options.find((option) => option.name === challenge.correctMove);

  if (isCorrect) {
    const delta = 8 + Math.min(state.streak, 5);
    state.score += delta;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);

    setFeedback(
      "success",
      `Correct. ${picked.display} lands the strongest hit on ${capitalize(challenge.defenderType)}. +${delta} points.`,
    );

    pushHistory({
      result: "win",
      pokemonName: challenge.pokemon.display,
      defenderType: challenge.defenderType,
      pickedMove: picked.display,
      correctMove: picked.display,
      scoreDelta: delta,
    });

    ctxRef?.track("move-master:correct", {
      score: state.score,
      streak: state.streak,
      move: picked.name,
      defenderType: challenge.defenderType,
    });
  } else {
    const delta = -4;
    state.score = clamp(state.score + delta, 0, 999999);
    state.streak = 0;

    const pickedMulti = typeEffectiveness(picked.typeName, [challenge.defenderType]);
    const bestMulti = best ? typeEffectiveness(best.typeName, [challenge.defenderType]) : 1;

    setFeedback(
      "danger",
      `Missed. ${best?.display || "Correct move"} was best (${bestMulti}x), while ${picked.display} hit for ${pickedMulti}x.`,
    );

    pushHistory({
      result: "loss",
      pokemonName: challenge.pokemon.display,
      defenderType: challenge.defenderType,
      pickedMove: picked.display,
      correctMove: best?.display || "",
      scoreDelta: delta,
    });

    ctxRef?.track("move-master:wrong", {
      score: state.score,
      picked: picked.name,
      correct: challenge.correctMove,
      defenderType: challenge.defenderType,
    });
  }

  render();
};

const renderOption = (option, challenge) => {
  const selected = challenge.selectedMove === option.name;
  const correct = challenge.correctMove === option.name;
  const showResult = challenge.resolved;
  const classes = ["move-master-option"];

  if (showResult && correct) classes.push("is-correct");
  if (showResult && selected && !correct) classes.push("is-wrong");

  const multiplier = typeEffectiveness(option.typeName, [challenge.defenderType]);

  return `
    <button class="${classes.join(" ")}" type="button" data-action="pick" data-move="${escapeHtml(option.name)}" ${showResult || state.loading ? "disabled" : ""}>
      <span class="move-master-option-title">${escapeHtml(option.display)}</span>
      <span class="move-master-option-meta">
        <span class="arcade-chip">Type ${escapeHtml(capitalize(option.typeName))}</span>
        <span class="arcade-chip">Power ${option.power}</span>
        <span class="arcade-chip">Acc ${option.accuracy || "--"}</span>
        <span class="arcade-chip">${escapeHtml(capitalize(option.damageClass))}</span>
      </span>
      ${showResult ? `<span class="move-master-multiplier">${multiplier}x vs ${escapeHtml(capitalize(challenge.defenderType))}</span>` : ""}
    </button>
  `;
};

const render = () => {
  if (!root) return;

  const challenge = state.challenge;

  if (!challenge) {
    root.innerHTML = `
      <div class="move-master-shell arcade-stack">
        <article class="arcade-card move-master-empty">
          <h3>Move Master</h3>
          <p>No battle challenge loaded.</p>
          <button class="arcade-btn" type="button" data-action="new" ${state.loading ? "disabled" : ""}>Load Challenge</button>
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
              <span class="move-master-history-result ${entry.result === "win" ? "is-win" : "is-loss"}">
                ${entry.result === "win" ? "Win" : "Loss"}
              </span>
              <span>${escapeHtml(entry.pokemonName)} vs ${escapeHtml(capitalize(entry.defenderType))}</span>
              <span>${escapeHtml(entry.correctMove)}</span>
            </li>
          `;
        })
        .join("")
    : '<li class="is-empty">No move rounds played yet.</li>';

  root.innerHTML = `
    <div class="move-master-shell arcade-stack">
      <article class="arcade-card move-master-head">
        <h3>Move Master</h3>
        <p>
          Opponent Type: <span class="move-master-target">${escapeHtml(capitalize(challenge.defenderType))}</span>
        </p>
        <div class="arcade-metrics">
          <span class="arcade-chip">Score ${state.score}</span>
          <span class="arcade-chip">Streak ${state.streak}</span>
          <span class="arcade-chip">Best ${state.bestStreak}</span>
          <span class="arcade-chip">Rounds ${state.roundsPlayed}</span>
        </div>
        <p class="${feedbackClass(state.feedback.tone)}">${escapeHtml(state.feedback.message)}</p>
      </article>

      <section class="move-master-field">
        <article class="arcade-card move-master-pokemon">
          <div class="arcade-media">
            <img src="${escapeHtml(challenge.pokemon.sprite || "")}" alt="${escapeHtml(challenge.pokemon.display)}" loading="lazy" />
          </div>
          <h4>${escapeHtml(challenge.pokemon.display)}</h4>
          <p>${escapeHtml(formatId(challenge.pokemon.id))}</p>
          <div class="move-master-types">
            ${(challenge.pokemon.typeNames || [])
              .map((typeName) => `<span class="arcade-chip">${escapeHtml(capitalize(typeName))}</span>`)
              .join("")}
          </div>
        </article>

        <article class="arcade-card move-master-options-wrap">
          <h4>Choose Your Move</h4>
          <div class="move-master-options">
            ${challenge.options.map((option) => renderOption(option, challenge)).join("")}
          </div>
          <div class="move-master-actions">
            <button class="arcade-btn" type="button" data-action="new" ${state.loading ? "disabled" : ""}>Next Challenge</button>
          </div>
        </article>
      </section>

      <article class="arcade-card">
        <h3>Recent Battles</h3>
        <ul class="move-master-history">${history}</ul>
      </article>
    </div>
  `;
};

const onClick = async (event) => {
  const target = event.target instanceof Element ? event.target.closest("[data-action]") : null;
  if (!target) return;

  const action = target.getAttribute("data-action");

  if (action === "pick") {
    resolveChoice(target.getAttribute("data-move") || "");
    return;
  }

  if (action === "new") {
    await queueChallenge();
  }
};

const moduleApi = {
  id: GAME_ID,
  title: "Move Master",
  category: "Combat",

  async init(ctx) {
    ctxRef = ctx;
    try {
      await ensureRoster(ctx);
      ctx.track("move-master:init", { rosterSize: rosterPool.length });
    } catch {
      // Fallback to lazy loading.
    }
  },

  async mount(ctx) {
    ctxRef = ctx;

    root = document.createElement("section");
    root.className = "game-panel move-master";

    abortController = new AbortController();
    root.addEventListener("click", onClick, { signal: abortController.signal });

    ctx.shell.setGameContent(root);
    render();

    if (!state.challenge) {
      await queueChallenge();
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
        challenge: state.challenge,
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
      challenge: deserializeChallenge(data.challenge),
      history: serializeHistory(Array.isArray(data.history) ? data.history : []),
      feedback: {
        tone: String(data.feedback?.tone || "neutral"),
        message: String(data.feedback?.message || createDefaultState().feedback.message),
      },
    };
  },
};

export default moduleApi;
