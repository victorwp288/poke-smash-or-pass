import { POKEAPI, capitalize, sumBaseStats } from "../shared/util.js";

const API_CACHE = "arcade-api-v1";

const normalizePokemon = (details, species) => {
  const typeNames = (details.types || [])
    .slice()
    .sort((a, b) => (a.slot || 0) - (b.slot || 0))
    .map((entry) => entry?.type?.name)
    .filter(Boolean);

  return {
    id: details.id,
    rawName: details.name,
    name: capitalize(details.name),
    height: details.height,
    weight: details.weight,
    types: details.types || [],
    typeNames,
    stats: details.stats || [],
    baseStatTotal: sumBaseStats(details.stats || []),
    abilities: details.abilities || [],
    moves: details.moves || [],
    sprite:
      details.sprites?.other?.["official-artwork"]?.front_default ||
      details.sprites?.other?.home?.front_default ||
      details.sprites?.front_default ||
      "",
    shinySprite:
      details.sprites?.other?.["official-artwork"]?.front_shiny ||
      details.sprites?.front_shiny ||
      "",
    cry: details.cries?.latest || details.cries?.legacy || "",
    species: {
      color: species?.color?.name || "unknown",
      habitat: species?.habitat?.name || "unknown",
      generation: species?.generation?.name || "unknown",
      flavor: (species?.flavor_text_entries || []).find((entry) => entry.language?.name === "en")?.flavor_text || "",
      evolutionChainUrl: species?.evolution_chain?.url || "",
    },
  };
};

const toAbsolute = (pathOrUrl) =>
  String(pathOrUrl).startsWith("http") ? pathOrUrl : `${POKEAPI}/${String(pathOrUrl).replace(/^\/+/, "")}`;

export class PokemonRepo {
  constructor() {
    this.memory = new Map();
    this.speciesMemory = new Map();
    this.genMemory = new Map();
    this.moveMemory = new Map();
    this.chainMemory = new Map();
  }

  async fetchJson(pathOrUrl) {
    const url = toAbsolute(pathOrUrl);
    if (this.memory.has(url)) {
      return this.memory.get(url);
    }

    const fromCache = await this.readFromCache(url);
    if (fromCache) {
      this.memory.set(url, fromCache);
      this.revalidate(url).catch(() => {});
      return fromCache;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed for ${url}: ${response.status}`);
    }

    const data = await response.json();
    this.memory.set(url, data);
    this.writeToCache(url, response.clone()).catch(() => {});
    return data;
  }

  async readFromCache(url) {
    if (!("caches" in window)) return null;
    try {
      const cache = await caches.open(API_CACHE);
      const hit = await cache.match(url);
      if (!hit) return null;
      return await hit.json();
    } catch {
      return null;
    }
  }

  async writeToCache(url, response) {
    if (!("caches" in window)) return;
    try {
      const cache = await caches.open(API_CACHE);
      await cache.put(url, response);
    } catch {
      // Ignore cache write errors
    }
  }

  async revalidate(url) {
    const response = await fetch(url);
    if (!response.ok) return;
    const data = await response.clone().json();
    this.memory.set(url, data);
    await this.writeToCache(url, response);
  }

  async getPokemon(nameOrId) {
    const key = String(nameOrId).toLowerCase();
    if (this.speciesMemory.has(`pokemon:${key}`)) {
      return this.speciesMemory.get(`pokemon:${key}`);
    }

    const [details, species] = await Promise.all([
      this.fetchJson(`pokemon/${key}`),
      this.fetchJson(`pokemon-species/${key}`),
    ]);

    const pokemon = normalizePokemon(details, species);
    this.speciesMemory.set(`pokemon:${key}`, pokemon);
    this.speciesMemory.set(`pokemon:${pokemon.id}`, pokemon);
    this.speciesMemory.set(`pokemon:${pokemon.rawName}`, pokemon);
    return pokemon;
  }

  async getGenerationRoster(genId) {
    const key = String(genId);
    if (this.genMemory.has(key)) return this.genMemory.get(key);
    const data = await this.fetchJson(`generation/${key}`);
    const names = (data?.pokemon_species || []).map((entry) => entry.name).filter(Boolean);
    this.genMemory.set(key, names);
    return names;
  }

  async getEvolutionChain(speciesNameOrId) {
    const key = String(speciesNameOrId).toLowerCase();
    if (this.chainMemory.has(key)) return this.chainMemory.get(key);

    const species = await this.fetchJson(`pokemon-species/${key}`);
    const chainUrl = species?.evolution_chain?.url;
    if (!chainUrl) return [];

    const chain = await this.fetchJson(chainUrl);
    const names = [];

    const walk = (node) => {
      if (!node) return;
      if (node.species?.name) names.push(node.species.name);
      (node.evolves_to || []).forEach(walk);
    };

    walk(chain.chain);
    this.chainMemory.set(key, names);
    this.chainMemory.set(String(species.id), names);
    return names;
  }

  async getMove(moveNameOrId) {
    const key = String(moveNameOrId).toLowerCase();
    if (this.moveMemory.has(key)) return this.moveMemory.get(key);
    const move = await this.fetchJson(`move/${key}`);
    this.moveMemory.set(key, move);
    return move;
  }

  async warmup(names = []) {
    await Promise.all(
      names.slice(0, 8).map(async (name) => {
        try {
          await this.getPokemon(name);
        } catch {
          // Ignore warmup failures
        }
      }),
    );
  }
}
