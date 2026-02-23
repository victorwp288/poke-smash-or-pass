import { clamp, dateSeed, formatId, typeEffectiveness } from "../../shared/util.js";

const MODULE_ID = "champion-gauntlet";
const SNAPSHOT_VERSION = 1;

const TOTAL_ENCOUNTERS = 10;
const STARTING_TEAM_SIZE = 3;
const MAX_TEAM_SIZE = 5;
const HEAL_CHARGES = 3;
const MAX_LOG_LINES = 80;
const EXPANSION_CHECKPOINTS = new Set([3, 6, 8]);

const FALLBACK_ROSTER = [
  "pikachu",
  "charizard",
  "blastoise",
  "venusaur",
  "snorlax",
  "dragonite",
  "gengar",
  "alakazam",
  "garchomp",
  "lucario",
  "gardevoir",
  "metagross",
  "tyranitar",
  "salamence",
  "milotic",
  "lapras",
  "arcanine",
  "mimikyu",
  "aegislash",
  "greninja",
];

const STAT = {
  hp: "hp",
  attack: "attack",
  defense: "defense",
  specialAttack: "special-attack",
  specialDefense: "special-defense",
  speed: "speed",
};

const runtime = {
  ctx: null,
  root: null,
  roster: [],
  pokemonCache: new Map(),
  inflight: new Map(),
  runTicket: 0,
};

const freshMetrics = () => ({
  wins: 0,
  losses: 0,
  turns: 0,
  damageDealt: 0,
  damageTaken: 0,
  switches: 0,
  healsUsed: 0,
  faints: 0,
  perfects: 0,
});

const createInitialState = () => ({
  version: SNAPSHOT_VERSION,
  status: "idle",
  seed: 0,
  rngState: 0,
  runId: "",
  busy: false,
  error: "",
  draftOptions: [],
  expansionOptions: [],
  team: [],
  usedPokemon: [],
  opponentQueue: [],
  opponent: null,
  activeIndex: 0,
  encounterIndex: 0,
  encounterTurns: 0,
  encounterDamageTaken: 0,
  healsLeft: HEAL_CHARGES,
  result: null,
  medals: [],
  finishedAt: null,
  history: [],
  metrics: freshMetrics(),
  log: ["Draft 3 Pokemon, clear 10 encounters, and claim medals."],
});

let state = createInitialState();

const normalizeName = (name) => String(name || "").toLowerCase().trim();

const titleCase = (text = "") =>
  String(text)
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("-");

const statValue = (stats = [], key) =>
  Number(stats.find((entry) => entry?.stat?.name === key)?.base_stat || 0);

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const pushLog = (line) => {
  if (!line) return;
  const encounter = Math.min(state.encounterIndex + 1, TOTAL_ENCOUNTERS);
  state.log.push(`E${String(encounter).padStart(2, "0")} ${line}`);
  if (state.log.length > MAX_LOG_LINES) {
    state.log.splice(0, state.log.length - MAX_LOG_LINES);
  }
};

const rememberNames = (names = []) => {
  const set = new Set((state.usedPokemon || []).map(normalizeName));
  names.forEach((name) => {
    const normalized = normalizeName(name);
    if (normalized) set.add(normalized);
  });
  state.usedPokemon = Array.from(set);
};

const nextRandom = () => {
  state.rngState = (state.rngState * 1664525 + 1013904223) >>> 0;
  return state.rngState / 4294967296;
};

const randomRange = (min, max) => min + (max - min) * nextRandom();

const createSeed = () => {
  const day = Number(dateSeed()) >>> 0;
  const jitter = Math.floor((runtime.ctx?.rng?.random?.() ?? Math.random()) * 1_000_000) >>> 0;
  const seed = (day ^ (jitter << 1) ^ 0x9e3779b9) >>> 0;
  return seed || 123456789;
};

const sanitizeFighter = (value) => {
  if (!value || typeof value !== "object") return null;
  const rawName = normalizeName(value.rawName || value.name);
  if (!rawName) return null;
  const maxHp = Math.max(1, Number(value.maxHp) || 1);
  const currentHp = clamp(Number(value.currentHp ?? maxHp), 0, maxHp);
  const attack = Math.max(1, Number(value.attack) || 1);
  const defense = Math.max(1, Number(value.defense) || 1);
  const speed = Math.max(1, Number(value.speed) || 1);
  const power = Math.max(1, Number(value.power) || 1);
  const types = Array.isArray(value.types) && value.types.length
    ? value.types.map((item) => normalizeName(item) || "normal")
    : ["normal"];

  return {
    id: Number(value.id) || 0,
    rawName,
    name: value.name || titleCase(rawName),
    sprite: value.sprite || "",
    types,
    maxHp,
    currentHp,
    attack,
    defense,
    speed,
    power,
    fainted: currentHp <= 0,
    role: value.role === "enemy" ? "enemy" : "player",
  };
};

const snapshotState = () => ({
  version: SNAPSHOT_VERSION,
  status: state.status,
  seed: state.seed,
  rngState: state.rngState,
  runId: state.runId,
  error: "",
  draftOptions: state.draftOptions.map(sanitizeFighter).filter(Boolean),
  expansionOptions: state.expansionOptions.map(sanitizeFighter).filter(Boolean),
  team: state.team.map(sanitizeFighter).filter(Boolean),
  usedPokemon: [...state.usedPokemon],
  opponentQueue: [...state.opponentQueue],
  opponent: sanitizeFighter(state.opponent),
  activeIndex: state.activeIndex,
  encounterIndex: state.encounterIndex,
  encounterTurns: state.encounterTurns,
  encounterDamageTaken: state.encounterDamageTaken,
  healsLeft: state.healsLeft,
  result: state.result,
  medals: Array.isArray(state.medals) ? [...state.medals] : [],
  finishedAt: state.finishedAt,
  history: Array.isArray(state.history) ? [...state.history] : [],
  metrics: { ...freshMetrics(), ...(state.metrics || {}) },
  log: Array.isArray(state.log) ? [...state.log].slice(-MAX_LOG_LINES) : [],
});

const hydrateState = (payload) => {
  if (!payload || typeof payload !== "object") return createInitialState();
  const next = createInitialState();

  next.version = SNAPSHOT_VERSION;
  next.status = typeof payload.status === "string" ? payload.status : "idle";
  next.seed = Number(payload.seed) || 0;
  next.rngState = Number(payload.rngState) || 0;
  next.runId = typeof payload.runId === "string" ? payload.runId : "";
  next.error = "";
  next.draftOptions = (payload.draftOptions || []).map(sanitizeFighter).filter(Boolean);
  next.expansionOptions = (payload.expansionOptions || []).map(sanitizeFighter).filter(Boolean);
  next.team = (payload.team || []).map(sanitizeFighter).filter(Boolean);
  next.usedPokemon = Array.from(
    new Set((payload.usedPokemon || []).map(normalizeName).filter(Boolean)),
  );
  next.opponentQueue = (payload.opponentQueue || []).map(normalizeName).filter(Boolean);
  next.opponent = sanitizeFighter(payload.opponent);
  next.activeIndex = Math.max(0, Number(payload.activeIndex) || 0);
  next.encounterIndex = clamp(Number(payload.encounterIndex) || 0, 0, TOTAL_ENCOUNTERS);
  next.encounterTurns = Math.max(0, Number(payload.encounterTurns) || 0);
  next.encounterDamageTaken = Math.max(0, Number(payload.encounterDamageTaken) || 0);
  const restoredHeals = Number(payload.healsLeft);
  next.healsLeft = Number.isFinite(restoredHeals)
    ? clamp(restoredHeals, 0, HEAL_CHARGES)
    : HEAL_CHARGES;
  next.result = payload.result === "victory" || payload.result === "defeat" ? payload.result : null;
  next.medals = Array.isArray(payload.medals) ? payload.medals : [];
  next.finishedAt = typeof payload.finishedAt === "string" ? payload.finishedAt : null;
  next.history = Array.isArray(payload.history) ? payload.history : [];
  next.metrics = { ...freshMetrics(), ...(payload.metrics || {}) };
  next.log = Array.isArray(payload.log) && payload.log.length
    ? payload.log.slice(-MAX_LOG_LINES)
    : next.log;

  if (!next.seed) {
    next.seed = createSeed();
  }
  if (!next.rngState) {
    next.rngState = next.seed;
  }

  next.busy = false;
  next.error = "";

  if (next.status === "loading") {
    if (next.team.length >= STARTING_TEAM_SIZE) {
      next.status = next.opponent ? "battle" : "draft";
    } else {
      next.status = "draft";
    }
  }

  return next;
};

const persist = () => {
  if (!runtime.ctx?.storage?.saveGameState) return;
  runtime.ctx.storage.saveGameState(MODULE_ID, {
    data: {
      version: SNAPSHOT_VERSION,
      payload: snapshotState(),
    },
  });
};

const isRestorableState = () =>
  state.status !== "idle" &&
  (state.draftOptions.length > 0 ||
    state.team.length > 0 ||
    state.opponent !== null ||
    state.status === "summary");

const ensureRoster = async () => {
  if (runtime.roster.length) return runtime.roster;
  if (!runtime.ctx?.repo) {
    runtime.roster = [...FALLBACK_ROSTER];
    return runtime.roster;
  }

  try {
    const generations = [1, 2, 3, 4, 5];
    const groups = await Promise.all(
      generations.map((genId) => runtime.ctx.repo.getGenerationRoster(genId).catch(() => [])),
    );
    const merged = Array.from(
      new Set(groups.flat().map(normalizeName).filter(Boolean)),
    );
    runtime.roster = merged.length >= 120
      ? merged
      : Array.from(new Set([...merged, ...FALLBACK_ROSTER]));
  } catch {
    runtime.roster = [...FALLBACK_ROSTER];
  }

  if (!runtime.roster.length) {
    runtime.roster = [...FALLBACK_ROSTER];
  }

  runtime.ctx.repo.warmup(runtime.roster.slice(0, 10)).catch(() => {});
  return runtime.roster;
};

const loadPokemon = async (name) => {
  const key = normalizeName(name);
  if (!key) return null;
  if (runtime.pokemonCache.has(key)) return runtime.pokemonCache.get(key);
  if (runtime.inflight.has(key)) return runtime.inflight.get(key);

  const request = runtime.ctx.repo
    .getPokemon(key)
    .then((pokemon) => {
      runtime.pokemonCache.set(key, pokemon);
      runtime.inflight.delete(key);
      return pokemon;
    })
    .catch((error) => {
      runtime.inflight.delete(key);
      throw error;
    });

  runtime.inflight.set(key, request);
  return request;
};

const drawNames = (count, excluded = new Set()) => {
  const picks = [];
  if (!runtime.roster.length) return picks;

  let attempts = 0;
  const attemptLimit = Math.max(24, runtime.roster.length * 8);

  while (picks.length < count && attempts < attemptLimit) {
    attempts += 1;
    const idx = Math.floor(nextRandom() * runtime.roster.length);
    const name = runtime.roster[idx];
    if (!name || excluded.has(name) || picks.includes(name)) continue;
    picks.push(name);
  }

  if (picks.length < count) {
    for (let i = 0; i < runtime.roster.length && picks.length < count; i += 1) {
      const name = runtime.roster[i];
      if (!name || excluded.has(name) || picks.includes(name)) continue;
      picks.push(name);
    }
  }

  return picks;
};

const fighterFromPokemon = (pokemon, options = {}) => {
  const role = options.role === "enemy" ? "enemy" : "player";
  const encounterScale = Number(options.encounterScale) || 1;

  const hp = statValue(pokemon.stats, STAT.hp);
  const attack = statValue(pokemon.stats, STAT.attack);
  const defense = statValue(pokemon.stats, STAT.defense);
  const specialAttack = statValue(pokemon.stats, STAT.specialAttack);
  const specialDefense = statValue(pokemon.stats, STAT.specialDefense);
  const speed = statValue(pokemon.stats, STAT.speed);

  const offense = Math.max(attack, specialAttack);
  const guard = Math.max(defense, specialDefense);

  const baseHp = Math.max(64, Math.floor(hp * 2.2 + pokemon.baseStatTotal * 0.12 + 24));
  const hpScale = role === "enemy" ? 1 + encounterScale * 0.18 : 1;
  const atkScale = role === "enemy" ? 0.94 + encounterScale * 0.2 : 0.96;
  const defScale = role === "enemy" ? 0.92 + encounterScale * 0.18 : 0.94;
  const powerScale = role === "enemy" ? 1 + encounterScale * 0.08 : 1;

  const maxHp = Math.max(52, Math.floor(baseHp * hpScale));
  const unitAttack = Math.max(18, Math.floor(offense * atkScale));
  const unitDefense = Math.max(14, Math.floor(guard * defScale));
  const unitSpeed = Math.max(10, Math.floor(speed));
  const power = Math.max(24, Math.floor((28 + offense * 0.5) * powerScale));
  const unitTypes = (pokemon.typeNames || [])
    .map(normalizeName)
    .filter(Boolean)
    .slice(0, 2);

  return {
    id: pokemon.id,
    rawName: normalizeName(pokemon.rawName || pokemon.name),
    name: pokemon.name || titleCase(pokemon.rawName || pokemon.name),
    sprite: pokemon.sprite || "",
    types: unitTypes.length ? unitTypes : ["normal"],
    maxHp,
    currentHp: maxHp,
    attack: unitAttack,
    defense: unitDefense,
    speed: unitSpeed,
    power,
    fainted: false,
    role,
  };
};

const loadFighters = async (names, options = {}) => {
  const fighters = await Promise.all(
    (names || []).map(async (name) => {
      try {
        const pokemon = await loadPokemon(name);
        if (!pokemon) return null;
        return fighterFromPokemon(pokemon, options);
      } catch {
        return null;
      }
    }),
  );
  return fighters.map(sanitizeFighter).filter(Boolean);
};

const ensureActiveFighter = () => {
  if (!state.team.length) {
    state.activeIndex = 0;
    return;
  }
  const current = state.team[state.activeIndex];
  if (current && current.currentHp > 0) return;
  const nextIdx = state.team.findIndex((unit) => unit.currentHp > 0);
  state.activeIndex = nextIdx >= 0 ? nextIdx : 0;
};

const activeFighter = () => {
  ensureActiveFighter();
  const unit = state.team[state.activeIndex];
  if (!unit || unit.currentHp <= 0) return null;
  return unit;
};

const typeLabel = (multiplier) => {
  if (multiplier >= 2) return " (super effective)";
  if (multiplier <= 0.5) return " (resisted)";
  return "";
};

const chooseAttackType = (attacker, defender) => {
  const attackTypes = attacker?.types?.length ? attacker.types : ["normal"];
  if (attackTypes.length === 1) return attackTypes[0];

  let best = attackTypes[0];
  let bestScore = -1;

  attackTypes.forEach((candidate) => {
    const score = clamp(typeEffectiveness(candidate, defender?.types || []), 0.25, 4);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
      return;
    }
    if (score === bestScore && nextRandom() > 0.5) {
      best = candidate;
    }
  });

  return best;
};

const resolveDamage = (attacker, defender) => {
  const attackType = chooseAttackType(attacker, defender);
  const power = Math.max(1, Number(attacker.power) || 1);
  const atk = Math.max(1, Number(attacker.attack) || 1);
  const def = Math.max(1, Number(defender.defense) || 1);
  const typeMultiplier = clamp(typeEffectiveness(attackType, defender.types || []), 0.25, 4);
  const stab = (attacker.types || []).includes(attackType) ? 1.2 : 1;
  const variance = randomRange(0.9, 1.1);
  const damage = Math.max(
    1,
    Math.floor((power * (atk / def)) * typeMultiplier * stab * variance),
  );

  return {
    damage,
    attackType,
    typeMultiplier,
  };
};

const damageTarget = (target, amount) => {
  target.currentHp = clamp(target.currentHp - amount, 0, target.maxHp);
  target.fainted = target.currentHp <= 0;
};

const healTeamBetweenEncounters = () => {
  let restored = 0;
  state.team.forEach((unit) => {
    if (unit.currentHp <= 0) return;
    const before = unit.currentHp;
    const gain = Math.max(5, Math.floor(unit.maxHp * 0.1));
    unit.currentHp = clamp(unit.currentHp + gain, 0, unit.maxHp);
    restored += unit.currentHp - before;
  });
  if (restored > 0) {
    pushLog(`Camp recovery restored ${restored} total HP.`);
  }
};

const buildMedals = (victory) => {
  const medals = [];
  const { metrics } = state;

  if (victory) {
    medals.push({
      id: "crown",
      title: "Champion Crown",
      text: "Cleared all 10 encounters.",
      tier: "gold",
    });
  }

  if (metrics.faints === 0 && metrics.wins >= 5) {
    medals.push({
      id: "ironwall",
      title: "Iron Wall",
      text: "No team members fainted.",
      tier: "silver",
    });
  }

  if (metrics.healsUsed === 0 && metrics.wins >= 4) {
    medals.push({
      id: "dry-kit",
      title: "Dry Med Kit",
      text: "Won without using heal charges.",
      tier: "silver",
    });
  }

  if (metrics.perfects >= 3) {
    medals.push({
      id: "clean-sweep",
      title: "Clean Sweep",
      text: "Three or more damage-free encounters.",
      tier: "bronze",
    });
  }

  if (metrics.switches >= 5 && metrics.wins >= 6) {
    medals.push({
      id: "pivot-master",
      title: "Pivot Master",
      text: "Used switching as a core tactic.",
      tier: "bronze",
    });
  }

  if (!victory && metrics.wins >= 7) {
    medals.push({
      id: "last-stand",
      title: "Last Stand",
      text: "Reached deep into the gauntlet before falling.",
      tier: "bronze",
    });
  }

  if (!medals.length) {
    medals.push({
      id: "ribbon",
      title: "Rookie Ribbon",
      text: "Complete another run for stronger medals.",
      tier: "bronze",
    });
  }

  return medals;
};

const finishRun = (victory) => {
  const defeatedBy = state.opponent?.name || "Unknown";
  state.status = "summary";
  state.result = victory ? "victory" : "defeat";
  state.finishedAt = new Date().toISOString();
  state.busy = false;
  state.medals = buildMedals(victory);
  state.opponent = null;

  if (!victory) {
    state.metrics.losses += 1;
    if (!state.history.some((entry) => entry.encounter === state.encounterIndex + 1 && entry.outcome === "loss")) {
      state.history.push({
        encounter: state.encounterIndex + 1,
        opponent: defeatedBy,
        outcome: "loss",
        turns: state.encounterTurns,
      });
    }
  }

  pushLog(victory ? "Gauntlet clear. You are the Champion." : "Run over. Rally and try again.");

  runtime.ctx?.track?.("champion_gauntlet_finished", {
    result: state.result,
    wins: state.metrics.wins,
    healsUsed: state.metrics.healsUsed,
    faints: state.metrics.faints,
  });

  persist();
  render();
};

const anyTeamAlive = () => state.team.some((unit) => unit.currentHp > 0);

const enemyTurn = () => {
  if (state.status !== "battle") return;
  if (!state.opponent || state.opponent.currentHp <= 0) return;

  const defender = activeFighter();
  if (!defender) {
    finishRun(false);
    return;
  }

  const strike = resolveDamage(state.opponent, defender);
  damageTarget(defender, strike.damage);

  state.metrics.damageTaken += strike.damage;
  state.encounterDamageTaken += strike.damage;

  pushLog(
    `${state.opponent.name} hit ${defender.name} for ${strike.damage}${typeLabel(strike.typeMultiplier)}.`,
  );

  if (defender.currentHp <= 0) {
    state.metrics.faints += 1;
    pushLog(`${defender.name} fainted.`);
    ensureActiveFighter();
    const replacement = activeFighter();
    if (!replacement) {
      finishRun(false);
      return;
    }
    pushLog(`${replacement.name} was sent out automatically.`);
  }
};

const beginEncounter = async () => {
  if (state.encounterIndex >= TOTAL_ENCOUNTERS) {
    finishRun(true);
    return;
  }
  if (!anyTeamAlive()) {
    finishRun(false);
    return;
  }

  state.status = "loading";
  state.busy = true;
  render();

  const ticket = runtime.runTicket;
  const queuedName = normalizeName(state.opponentQueue[state.encounterIndex]);
  const name = queuedName || drawNames(1, new Set(state.usedPokemon))[0];
  const fallbackName = normalizeName(name || FALLBACK_ROSTER[0]);

  let pokemon = null;
  try {
    pokemon = await loadPokemon(fallbackName);
  } catch {
    pokemon = null;
  }

  if (ticket !== runtime.runTicket) return;

  if (!pokemon) {
    state.error = "Unable to load encounter data.";
    state.status = "error";
    state.busy = false;
    render();
    return;
  }

  const scale = 1 + state.encounterIndex * 0.08;
  state.opponent = fighterFromPokemon(pokemon, { role: "enemy", encounterScale: scale });
  state.encounterTurns = 0;
  state.encounterDamageTaken = 0;
  state.status = "battle";
  state.busy = false;

  ensureActiveFighter();
  pushLog(
    `Encounter ${state.encounterIndex + 1}/${TOTAL_ENCOUNTERS} started vs ${state.opponent.name}.`,
  );

  runtime.ctx?.track?.("champion_gauntlet_encounter_start", {
    encounter: state.encounterIndex + 1,
    opponent: state.opponent.rawName,
  });

  persist();
  render();
};

const openExpansionDraft = async () => {
  state.status = "loading";
  state.busy = true;
  render();

  const ticket = runtime.runTicket;
  const excluded = new Set(state.usedPokemon.map(normalizeName));
  state.team.forEach((unit) => excluded.add(normalizeName(unit.rawName)));
  const picks = drawNames(3, excluded);
  const options = await loadFighters(picks, { role: "player" });

  if (ticket !== runtime.runTicket) return;

  if (!options.length) {
    state.status = "battle";
    state.busy = false;
    await beginEncounter();
    return;
  }

  state.expansionOptions = options;
  state.status = "expand";
  state.busy = false;
  pushLog("Optional expansion unlocked: recruit one teammate or skip.");
  persist();
  render();
};

const completeEncounter = async () => {
  state.metrics.wins += 1;

  if (state.encounterDamageTaken === 0) {
    state.metrics.perfects += 1;
  }

  const opponentName = state.opponent?.name || "Unknown";
  state.history.push({
    encounter: state.encounterIndex + 1,
    opponent: opponentName,
    outcome: "win",
    turns: state.encounterTurns,
  });

  pushLog(`${opponentName} defeated.`);
  state.opponent = null;
  state.encounterIndex += 1;

  healTeamBetweenEncounters();

  if (state.encounterIndex >= TOTAL_ENCOUNTERS) {
    finishRun(true);
    return;
  }

  if (EXPANSION_CHECKPOINTS.has(state.encounterIndex) && state.team.length < MAX_TEAM_SIZE) {
    await openExpansionDraft();
    return;
  }

  await beginEncounter();
};

const performAttack = async () => {
  if (state.status !== "battle" || state.busy) return;
  const attacker = activeFighter();
  const enemy = state.opponent;
  if (!attacker || !enemy) return;

  state.encounterTurns += 1;
  state.metrics.turns += 1;

  const strike = resolveDamage(attacker, enemy);
  damageTarget(enemy, strike.damage);
  state.metrics.damageDealt += strike.damage;

  pushLog(`${attacker.name} dealt ${strike.damage} to ${enemy.name}${typeLabel(strike.typeMultiplier)}.`);

  if (enemy.currentHp <= 0) {
    await completeEncounter();
    return;
  }

  enemyTurn();
  persist();
  render();
};

const performSwitch = (index) => {
  if (state.status !== "battle" || state.busy) return;
  if (!Number.isInteger(index)) return;
  if (index < 0 || index >= state.team.length) return;
  if (index === state.activeIndex) return;

  const target = state.team[index];
  if (!target || target.currentHp <= 0) return;

  state.encounterTurns += 1;
  state.metrics.turns += 1;
  state.metrics.switches += 1;
  state.activeIndex = index;

  pushLog(`Switched to ${target.name}.`);
  enemyTurn();
  persist();
  render();
};

const performHeal = () => {
  if (state.status !== "battle" || state.busy) return;
  if (state.healsLeft <= 0) {
    pushLog("No heal charges left.");
    render();
    return;
  }

  const fighter = activeFighter();
  if (!fighter) return;

  state.encounterTurns += 1;
  state.metrics.turns += 1;
  state.metrics.healsUsed += 1;
  state.healsLeft -= 1;

  const before = fighter.currentHp;
  const restored = Math.max(12, Math.floor(fighter.maxHp * 0.45));
  fighter.currentHp = clamp(fighter.currentHp + restored, 0, fighter.maxHp);

  pushLog(
    `${fighter.name} recovered ${fighter.currentHp - before} HP. ${state.healsLeft} heals remain.`,
  );

  enemyTurn();
  persist();
  render();
};

const setupDraft = async () => {
  state.status = "loading";
  state.busy = true;
  state.error = "";
  render();

  const ticket = runtime.runTicket;
  await ensureRoster();
  if (ticket !== runtime.runTicket) return;

  const excluded = new Set(state.usedPokemon.map(normalizeName));
  const picks = drawNames(8, excluded);
  const options = await loadFighters(picks, { role: "player" });

  if (ticket !== runtime.runTicket) return;

  if (!options.length) {
    state.status = "error";
    state.error = "Could not build a draft pool.";
    state.busy = false;
    render();
    return;
  }

  state.draftOptions = options;
  state.status = "draft";
  state.busy = false;
  pushLog("Draft exactly 3 starters.");
  persist();
  render();
};

const startNewRun = async () => {
  runtime.runTicket += 1;
  const seed = createSeed();
  state = createInitialState();
  state.seed = seed;
  state.rngState = seed;
  state.runId = `run-${Date.now()}-${Math.floor((runtime.ctx?.rng?.random?.() ?? Math.random()) * 1_000_000)}`;

  runtime.ctx?.track?.("champion_gauntlet_run_started", { seed: state.seed });
  pushLog("New gauntlet initialized.");
  persist();
  render();

  await setupDraft();
};

const pickDraft = (index) => {
  if (state.status !== "draft" || state.busy) return;
  if (!Number.isInteger(index) || index < 0 || index >= state.draftOptions.length) return;
  if (state.team.length >= STARTING_TEAM_SIZE) return;

  const fighter = state.draftOptions[index];
  if (!fighter) return;

  state.team.push({ ...fighter, currentHp: fighter.maxHp, fainted: false, role: "player" });
  state.draftOptions.splice(index, 1);
  rememberNames([fighter.rawName]);

  if (state.team.length === STARTING_TEAM_SIZE) {
    pushLog("Team ready. Enter the gauntlet.");
  } else {
    pushLog(`${fighter.name} drafted (${state.team.length}/${STARTING_TEAM_SIZE}).`);
  }

  persist();
  render();
};

const beginGauntlet = async () => {
  if (state.status !== "draft" || state.busy) return;
  if (state.team.length !== STARTING_TEAM_SIZE) return;

  state.metrics = freshMetrics();
  state.history = [];
  state.result = null;
  state.finishedAt = null;
  state.medals = [];
  state.healsLeft = HEAL_CHARGES;
  state.encounterIndex = 0;
  state.encounterTurns = 0;
  state.encounterDamageTaken = 0;
  state.activeIndex = 0;

  const excluded = new Set(state.usedPokemon.map(normalizeName));
  state.team.forEach((unit) => excluded.add(normalizeName(unit.rawName)));
  state.opponentQueue = drawNames(TOTAL_ENCOUNTERS, excluded);
  rememberNames(state.opponentQueue);

  pushLog("Gauntlet started. 10 encounters ahead.");
  persist();
  await beginEncounter();
};

const pickExpansion = async (index) => {
  if (state.status !== "expand" || state.busy) return;

  const fighter = Number.isInteger(index) ? state.expansionOptions[index] : null;
  if (fighter && state.team.length < MAX_TEAM_SIZE) {
    state.team.push({ ...fighter, currentHp: fighter.maxHp, fainted: false, role: "player" });
    rememberNames([fighter.rawName]);
    pushLog(`${fighter.name} joined the team (${state.team.length}/${MAX_TEAM_SIZE}).`);
  } else {
    pushLog("Expansion skipped.");
  }

  state.expansionOptions = [];
  persist();
  await beginEncounter();
};

const renderFighterCard = (fighter, options = {}) => {
  if (!fighter) return "";
  const hpPct = fighter.maxHp > 0 ? clamp((fighter.currentHp / fighter.maxHp) * 100, 0, 100) : 0;
  const typeMarkup = (fighter.types || ["normal"])
    .map((type) => `<span class="cg-type">${escapeHtml(titleCase(type))}</span>`)
    .join("");

  const cardClass = [
    "cg-fighter-card",
    options.active ? "is-active" : "",
    fighter.currentHp <= 0 ? "is-fainted" : "",
    options.compact ? "is-compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <article class="${cardClass}">
      <header class="cg-fighter-head">
        <h4>${escapeHtml(fighter.name)}</h4>
        <span class="cg-fighter-id">${escapeHtml(formatId(fighter.id))}</span>
      </header>
      <div class="cg-fighter-media">
        ${fighter.sprite ? `<img src="${escapeHtml(fighter.sprite)}" alt="${escapeHtml(fighter.name)}" loading="lazy" />` : "<div class=\"cg-sprite-fallback\">No Art</div>"}
      </div>
      <div class="cg-type-row">${typeMarkup}</div>
      <div class="cg-hp-meta">
        <span>HP ${fighter.currentHp}/${fighter.maxHp}</span>
        <span>ATK ${fighter.attack}</span>
        <span>DEF ${fighter.defense}</span>
      </div>
      <div class="cg-hp-track"><span style="width:${hpPct.toFixed(1)}%"></span></div>
      ${options.action ? `
        <button
          class="cg-btn ${options.actionClass || "cg-btn-ghost"}"
          data-action="${escapeHtml(options.action)}"
          data-index="${options.index}"
          ${options.disabled ? "disabled" : ""}
        >
          ${escapeHtml(options.actionLabel || "Select")}
        </button>
      ` : ""}
    </article>
  `;
};

const renderDraft = () => `
  <section class="cg-panel">
    <header class="cg-panel-head">
      <h3>Draft Starters</h3>
      <p>Pick ${STARTING_TEAM_SIZE} starters. You can expand to ${MAX_TEAM_SIZE} later.</p>
    </header>

    <div class="cg-team-inline">
      ${state.team.length
        ? state.team.map((fighter, idx) => renderFighterCard(fighter, { compact: true, active: idx === state.activeIndex })).join("")
        : "<p class=\"cg-muted\">No drafted Pokemon yet.</p>"}
    </div>

    <div class="cg-action-row">
      <button class="cg-btn" data-action="begin-gauntlet" ${state.team.length !== STARTING_TEAM_SIZE ? "disabled" : ""}>
        Enter Encounter 1
      </button>
      <button class="cg-btn-ghost" data-action="new-run">Reroll Draft</button>
    </div>

    <div class="cg-draft-grid">
      ${state.draftOptions.map((fighter, idx) =>
        renderFighterCard(fighter, {
          action: "draft-pick",
          actionLabel: state.team.length >= STARTING_TEAM_SIZE ? "Team Full" : "Draft",
          actionClass: "cg-btn",
          index: idx,
          disabled: state.team.length >= STARTING_TEAM_SIZE,
        }),
      ).join("")}
    </div>
  </section>
`;

const renderBattle = () => {
  const current = activeFighter();
  const enemy = state.opponent;

  return `
    <section class="cg-panel">
      <header class="cg-panel-head">
        <h3>Encounter ${state.encounterIndex + 1}/${TOTAL_ENCOUNTERS}</h3>
        <p>Formula: floor((power * atk/def) * typeMultiplier * stab * rand(0.9..1.1))</p>
      </header>

      <div class="cg-battle-grid">
        <div class="cg-duel-grid">
          ${current ? renderFighterCard(current, { active: true }) : "<div class=\"cg-empty\">No active fighter</div>"}
          ${enemy ? renderFighterCard(enemy) : "<div class=\"cg-empty\">No opponent</div>"}
        </div>

        <aside class="cg-team-panel">
          <h4>Your Team</h4>
          <div class="cg-team-list">
            ${state.team.map((fighter, idx) => {
              const hpPct = fighter.maxHp > 0 ? clamp((fighter.currentHp / fighter.maxHp) * 100, 0, 100) : 0;
              const activeClass = idx === state.activeIndex ? "is-active" : "";
              return `
                <div class="cg-team-row ${activeClass}">
                  <div>
                    <strong>${escapeHtml(fighter.name)}</strong>
                    <p>${fighter.currentHp}/${fighter.maxHp} HP</p>
                  </div>
                  <div class="cg-team-row-actions">
                    <div class="cg-mini-hp"><span style="width:${hpPct.toFixed(1)}%"></span></div>
                    <button
                      class="cg-btn-ghost"
                      data-action="switch"
                      data-index="${idx}"
                      ${idx === state.activeIndex || fighter.currentHp <= 0 || state.busy ? "disabled" : ""}
                    >
                      Switch
                    </button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </aside>
      </div>

      <div class="cg-action-row is-sticky">
        <button class="cg-btn" data-action="attack" ${state.busy ? "disabled" : ""}>Attack</button>
        <button class="cg-btn-ghost" data-action="heal" ${state.busy || state.healsLeft <= 0 ? "disabled" : ""}>
          Heal (${state.healsLeft})
        </button>
      </div>
    </section>
  `;
};

const renderExpansion = () => `
  <section class="cg-panel">
    <header class="cg-panel-head">
      <h3>Expansion Draft</h3>
      <p>Optional recruit. Team size: ${state.team.length}/${MAX_TEAM_SIZE}</p>
    </header>
    <div class="cg-team-inline">
      ${state.team.map((fighter, idx) => renderFighterCard(fighter, { compact: true, active: idx === state.activeIndex })).join("")}
    </div>
    <div class="cg-action-row">
      <button class="cg-btn-ghost" data-action="expand-skip">Skip Expansion</button>
    </div>
    <div class="cg-draft-grid">
      ${state.expansionOptions.map((fighter, idx) =>
        renderFighterCard(fighter, {
          action: "expand-pick",
          actionLabel: "Recruit",
          actionClass: "cg-btn",
          index: idx,
          disabled: state.team.length >= MAX_TEAM_SIZE || state.busy,
        }),
      ).join("")}
    </div>
  </section>
`;

const renderSummary = () => {
  const grade = state.metrics.wins >= 10 ? "S" : state.metrics.wins >= 8 ? "A" : state.metrics.wins >= 6 ? "B" : "C";
  const resultText = state.result === "victory" ? "Champion Run Complete" : "Run Failed";

  return `
    <section class="cg-panel">
      <header class="cg-summary-head ${state.result === "victory" ? "is-victory" : "is-defeat"}">
        <h3>${resultText}</h3>
        <p>Grade ${grade} · Wins ${state.metrics.wins}/${TOTAL_ENCOUNTERS}</p>
      </header>

      <div class="cg-summary-grid">
        <article class="cg-summary-card">
          <h4>Medals</h4>
          <div class="cg-medal-grid">
            ${state.medals.map((medal) => `
              <div class="cg-medal is-${escapeHtml(medal.tier || "bronze")}">
                <strong>${escapeHtml(medal.title)}</strong>
                <p>${escapeHtml(medal.text)}</p>
              </div>
            `).join("")}
          </div>
        </article>

        <article class="cg-summary-card">
          <h4>Run Stats</h4>
          <ul class="cg-stat-list">
            <li><span>Turns</span><strong>${state.metrics.turns}</strong></li>
            <li><span>Damage Dealt</span><strong>${state.metrics.damageDealt}</strong></li>
            <li><span>Damage Taken</span><strong>${state.metrics.damageTaken}</strong></li>
            <li><span>Switches</span><strong>${state.metrics.switches}</strong></li>
            <li><span>Heals Used</span><strong>${state.metrics.healsUsed}</strong></li>
            <li><span>Team Faints</span><strong>${state.metrics.faints}</strong></li>
            <li><span>Perfect Encounters</span><strong>${state.metrics.perfects}</strong></li>
          </ul>
        </article>
      </div>

      <article class="cg-summary-card">
        <h4>Encounter History</h4>
        <ol class="cg-history">
          ${state.history.map((entry) => `
            <li class="is-${escapeHtml(entry.outcome || "win")}">
              <span>Encounter ${entry.encounter}</span>
              <strong>${escapeHtml(entry.opponent || "Unknown")}</strong>
              <small>${escapeHtml(String(entry.outcome || "win").toUpperCase())} · ${entry.turns} turns</small>
            </li>
          `).join("")}
        </ol>
      </article>

      <div class="cg-action-row">
        <button class="cg-btn" data-action="new-run">Start New Run</button>
      </div>
    </section>
  `;
};

const renderLoading = () => `
  <section class="cg-panel cg-loading">
    <div class="cg-spinner"></div>
    <p>Preparing gauntlet data...</p>
  </section>
`;

const renderError = () => `
  <section class="cg-panel">
    <header class="cg-panel-head">
      <h3>Load Failure</h3>
      <p>${escapeHtml(state.error || "Unknown issue")}</p>
    </header>
    <div class="cg-action-row">
      <button class="cg-btn" data-action="new-run">Retry</button>
    </div>
  </section>
`;

const renderLog = () => `
  <section class="cg-log-panel">
    <header class="cg-log-head">
      <h4>Encounter Log</h4>
      <span>${state.log.length} entries</span>
    </header>
    <ul class="cg-log-list">
      ${state.log.slice(-18).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
    </ul>
  </section>
`;

const renderBody = () => {
  switch (state.status) {
    case "loading":
      return renderLoading();
    case "draft":
      return renderDraft();
    case "battle":
      return renderBattle();
    case "expand":
      return renderExpansion();
    case "summary":
      return renderSummary();
    case "error":
      return renderError();
    default:
      return renderLoading();
  }
};

const render = () => {
  if (!runtime.root) return;

  const encounterDisplay =
    state.status === "battle" || state.status === "expand"
      ? state.encounterIndex + 1
      : Math.min(state.encounterIndex, TOTAL_ENCOUNTERS);

  runtime.root.innerHTML = `
    <div class="cg-shell">
      <header class="cg-headline">
        <div class="cg-title">
          <h2>Champion Gauntlet</h2>
          <p>Flagship run mode with drafting, tactical actions, and medal scoring.</p>
        </div>
        <div class="cg-chip-row">
          <span class="cg-chip">Encounter ${encounterDisplay}/${TOTAL_ENCOUNTERS}</span>
          <span class="cg-chip">Heals ${state.healsLeft}/${HEAL_CHARGES}</span>
          <span class="cg-chip">Wins ${state.metrics.wins}</span>
          <span class="cg-chip">Team ${state.team.length}/${MAX_TEAM_SIZE}</span>
        </div>
      </header>

      ${renderBody()}
      ${renderLog()}
    </div>
  `;
};

const onRootClick = (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || !runtime.root?.contains(button)) return;
  const action = button.dataset.action;
  const index = Number.parseInt(button.dataset.index || "", 10);

  switch (action) {
    case "new-run":
      void startNewRun();
      break;
    case "draft-pick":
      pickDraft(index);
      break;
    case "begin-gauntlet":
      void beginGauntlet();
      break;
    case "attack":
      void performAttack();
      break;
    case "switch":
      performSwitch(index);
      break;
    case "heal":
      performHeal();
      break;
    case "expand-pick":
      void pickExpansion(index);
      break;
    case "expand-skip":
      void pickExpansion(-1);
      break;
    default:
      break;
  }
};

const init = async (ctx) => {
  runtime.ctx = ctx;
  await ensureRoster();
};

const mount = async (ctx) => {
  runtime.ctx = ctx;
  if (!runtime.root) {
    runtime.root = document.createElement("section");
    runtime.root.className = "cg-root";
    runtime.root.addEventListener("click", onRootClick);
  }

  ctx.shell.stage.innerHTML = "";
  ctx.shell.stage.appendChild(runtime.root);

  if (!isRestorableState()) {
    await startNewRun();
    return;
  }

  render();
};

const unmount = async (ctx) => {
  if (!runtime.root) return;
  if (runtime.root.parentElement === ctx.shell.stage) {
    ctx.shell.stage.removeChild(runtime.root);
  }
};

const getSnapshot = () => ({
  data: {
    version: SNAPSHOT_VERSION,
    payload: snapshotState(),
  },
});

const restoreSnapshot = (snapshot) => {
  const payload = snapshot?.data?.payload;
  if (!payload || snapshot?.data?.version !== SNAPSHOT_VERSION) {
    state = createInitialState();
    return;
  }
  state = hydrateState(payload);
  runtime.runTicket += 1;
};

export default {
  id: MODULE_ID,
  title: "Champion Gauntlet",
  category: "Flagship",
  init,
  mount,
  unmount,
  getSnapshot,
  restoreSnapshot,
};
