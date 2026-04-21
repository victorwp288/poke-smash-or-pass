import {
  MEGA_EVOLUTION_SPECIES,
  PARADOX_SPECIES,
  ULTRA_BEAST_SPECIES
} from "@/lib/constants";
import { fetchJson } from "@/lib/pokeapi/client";
import { normalizeEvolutionChain } from "@/lib/pokeapi/evolution";
import type { EvolutionStages, Pokemon, PokemonAbility } from "@/lib/pokeapi/types";
import type { PokemonTypeName } from "@/lib/typeChart";
import { capitalize, normalizeInlineText } from "@/lib/text";

const abilityEffectCache = new Map<string, string>();
const evolutionChainCache = new Map<string, EvolutionStages>();
const genRosterCache = new Map<number, string[]>();
const genRosterEntryCache = new Map<number, GenerationRosterEntry[]>();
const typeIndexCache = new Map<PokemonTypeName, Set<string>>();
const pokemonTypeCache = new Map<string, PokemonTypeName[]>();

export type GenerationRosterEntry = {
  id: number | null;
  name: string;
  generation: number;
};

const chooseFlavorText = (entries: any[]) => {
  const english = (Array.isArray(entries) ? entries : []).filter(
    (entry) => entry?.language?.name === "en"
  );
  const unique = Array.from(
    new Set(
      english
        .map((entry) =>
          String(entry?.flavor_text || "").replace(/\s+/g, " ").trim()
        )
        .filter(Boolean)
    )
  );
  return unique[0] || "No flavor text yet.";
};

const normalizeSprites = (sprites: any) => {
  const other = sprites?.other || {};
  const gallery = [
    other["official-artwork"]?.front_default,
    other.home?.front_default,
    other.dream_world?.front_default,
    sprites?.front_default,
    sprites?.back_default,
    sprites?.front_shiny,
    sprites?.back_shiny
  ].filter(Boolean);

  const main =
    other["official-artwork"]?.front_default ||
    other.home?.front_default ||
    sprites?.front_default ||
    "";
  const shiny = sprites?.front_shiny || other.home?.front_shiny || main;

  return {
    main,
    shiny,
    gallery: Array.from(new Set(gallery)).slice(0, 6)
  };
};

const normalizeTypeNames = (types: any): PokemonTypeName[] =>
  (Array.isArray(types) ? types : [])
    .slice()
    .sort((a: any, b: any) => (a?.slot || 0) - (b?.slot || 0))
    .map((entry: any) => entry?.type?.name)
    .filter(Boolean);

const getAbilityDescription = (abilityData: any) => {
  const entries = Array.isArray(abilityData?.effect_entries)
    ? abilityData.effect_entries
    : [];
  const englishShort = entries.find(
    (entry: any) => entry?.language?.name === "en" && entry?.short_effect
  );
  if (englishShort?.short_effect) {
    return normalizeInlineText(englishShort.short_effect);
  }
  const english = entries.find(
    (entry: any) => entry?.language?.name === "en" && entry?.effect
  );
  if (english?.effect) {
    return normalizeInlineText(english.effect);
  }
  return "";
};

const loadAbilityDescription = async (abilityRef: { name: string; url?: string }) => {
  const abilityName = abilityRef?.name || "";
  const abilityUrl = abilityRef?.url || "";
  const cacheKey = abilityUrl || abilityName;
  if (!cacheKey) return "";
  if (abilityEffectCache.has(cacheKey)) return abilityEffectCache.get(cacheKey)!;

  try {
    const payload = await fetchJson<any>(
      abilityUrl || `ability/${abilityName}`
    );
    const description =
      getAbilityDescription(payload) || "No description available yet.";
    abilityEffectCache.set(cacheKey, description);
    return description;
  } catch {
    const fallback = "No description available yet.";
    abilityEffectCache.set(cacheKey, fallback);
    return fallback;
  }
};

const getCategoryTags = (species: any): Pokemon["categoryTags"] => {
  const tags: Pokemon["categoryTags"] = [];
  const name = species?.name || "";
  if (species?.is_legendary) tags.push("legendary");
  if (species?.is_mythical) tags.push("mythical");
  if (ULTRA_BEAST_SPECIES.has(name)) tags.push("ultra-beast");
  if (PARADOX_SPECIES.has(name)) tags.push("paradox");
  return tags;
};

const getPrimaryCategory = (species: any): Pokemon["category"] => {
  const name = species?.name || "";
  if (species?.is_mythical) return "mythical";
  if (species?.is_legendary) return "legendary";
  if (ULTRA_BEAST_SPECIES.has(name)) return "ultra-beast";
  if (PARADOX_SPECIES.has(name)) return "paradox";
  return "standard";
};

const getGenerationFromId = (id: number) => {
  if (id >= 1 && id <= 151) return 1;
  if (id >= 152 && id <= 251) return 2;
  if (id >= 252 && id <= 386) return 3;
  if (id >= 387 && id <= 493) return 4;
  if (id >= 494 && id <= 649) return 5;
  if (id >= 650 && id <= 721) return 6;
  if (id >= 722 && id <= 809) return 7;
  if (id >= 810 && id <= 905) return 8;
  if (id >= 906 && id <= 1025) return 9;
  return null;
};

const getResourceId = (resourceUrl: unknown) => {
  const match = String(resourceUrl || "").match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
};

const setPokemonTypeCache = (name: string | undefined, typeNames: PokemonTypeName[]) => {
  const cacheKey = String(name || "").trim().toLowerCase();
  if (!cacheKey) return;
  pokemonTypeCache.set(cacheKey, [...typeNames]);
};

export const getDefaultPokemonRequestKey = (species: any, fallback = "") => {
  const varieties = Array.isArray(species?.varieties) ? species.varieties : [];
  const defaultVariety = varieties.find((entry: any) => entry?.is_default)?.pokemon?.name;
  const firstVariety = varieties.find((entry: any) => entry?.pokemon?.name)?.pokemon?.name;

  return String(defaultVariety || firstVariety || species?.name || fallback || "")
    .trim()
    .toLowerCase();
};

const loadPokemonDetails = async (key: string, speciesHint?: any) => {
  try {
    return await fetchJson<any>(`pokemon/${key}`);
  } catch (error) {
    const fallbackKey = getDefaultPokemonRequestKey(speciesHint, key);
    if (!fallbackKey || fallbackKey === key) {
      throw error;
    }
    return fetchJson<any>(`pokemon/${fallbackKey}`);
  }
};

const loadPokemonTypeNames = async (name: string | undefined) => {
  const cacheKey = String(name || "").trim().toLowerCase();
  if (!cacheKey) return [] as PokemonTypeName[];
  if (pokemonTypeCache.has(cacheKey)) return pokemonTypeCache.get(cacheKey)!;

  try {
    let payload: any;

    try {
      payload = await loadPokemonDetails(cacheKey);
    } catch {
      const species = await fetchJson<any>(`pokemon-species/${cacheKey}`);
      payload = await loadPokemonDetails(cacheKey, species);
    }

    const typeNames = normalizeTypeNames(payload?.types || []);
    setPokemonTypeCache(cacheKey, typeNames);
    setPokemonTypeCache(payload?.name || cacheKey, typeNames);
    setPokemonTypeCache(payload?.species?.name || payload?.name || cacheKey, typeNames);
    return typeNames;
  } catch {
    setPokemonTypeCache(cacheKey, []);
    return [];
  }
};

const loadEvolutionLine = async (chainUrl: string | undefined) => {
  if (!chainUrl) return [];
  if (evolutionChainCache.has(chainUrl)) return evolutionChainCache.get(chainUrl)!;

  try {
    const chain = await fetchJson<any>(chainUrl);
    const stages = normalizeEvolutionChain(chain);
    const uniqueNames = Array.from(
      new Set(stages.flatMap((stage) => stage.map((entry) => entry.name)).filter(Boolean))
    );

    if (uniqueNames.length) {
      const typeEntries = await Promise.all(
        uniqueNames.map(async (name) => [name, await loadPokemonTypeNames(name)] as const)
      );
      const typeMap = new Map<string, PokemonTypeName[]>(
        typeEntries.map(([name, typeNames]) => [name.toLowerCase(), typeNames])
      );
      stages.forEach((stage) => {
        stage.forEach((entry) => {
          entry.typeNames = typeMap.get(entry.name.toLowerCase()) || [];
        });
      });
    }

    evolutionChainCache.set(chainUrl, stages);
    return stages;
  } catch {
    evolutionChainCache.set(chainUrl, []);
    return [];
  }
};

export const fetchPokemon = async (nameOrId: string | number): Promise<Pokemon> => {
  const key = String(nameOrId).toLowerCase();
  let details: any;
  let species: any;

  try {
    details = await fetchJson<any>(`pokemon/${key}`);
    const speciesKey = String(details?.species?.name || key).toLowerCase();
    species = await fetchJson<any>(`pokemon-species/${speciesKey}`);
  } catch {
    species = await fetchJson<any>(`pokemon-species/${key}`);
    details = await loadPokemonDetails(key, species);
  }

  const typeNames = normalizeTypeNames(details?.types || []);
  const speciesName = String(
    species?.name || details?.species?.name || details?.name || key
  ).trim().toLowerCase();

  setPokemonTypeCache(key, typeNames);
  setPokemonTypeCache(details?.name || key, typeNames);
  setPokemonTypeCache(speciesName, typeNames);
  const evolution = await loadEvolutionLine(species?.evolution_chain?.url);
  const abilities: PokemonAbility[] = (
    await Promise.all(
      (details?.abilities || []).map(async (entry: any) => {
        const abilityName = entry?.ability?.name || "";
        if (!abilityName) return null;
        const description = await loadAbilityDescription({
          name: abilityName,
          url: entry?.ability?.url || ""
        });
        return {
          name: abilityName,
          isHidden: Boolean(entry?.is_hidden),
          slot: Number(entry?.slot) || 99,
          description
        } satisfies PokemonAbility;
      })
    )
  ).filter(Boolean) as PokemonAbility[];

  const generation = getGenerationFromId(Number(details?.id) || 0);

  const baseStatTotal = (details?.stats || []).reduce(
    (sum: number, stat: any) => sum + (Number(stat?.base_stat) || 0),
    0
  );

  const images = normalizeSprites(details?.sprites || {});
  const thumb =
    details?.sprites?.front_default ||
    details?.sprites?.other?.["official-artwork"]?.front_default ||
    details?.sprites?.other?.home?.front_default ||
    details?.sprites?.back_default ||
    images.main ||
    "";

  return {
    id: Number(details?.id) || 0,
    rawName: speciesName,
    name: capitalize(speciesName),
    generation,
    height: Number(details?.height) || 0,
    weight: Number(details?.weight) || 0,
    typeNames,
    baseStatTotal,
    category: getPrimaryCategory(species),
    speciesColor: species?.color?.name || "unknown",
    habitat: species?.habitat?.name || "unknown",
    nameLength: speciesName.length,
    abilities,
    categoryTags: getCategoryTags(species),
    cry: details?.cries?.latest || details?.cries?.legacy || "",
    canMegaEvolve: MEGA_EVOLUTION_SPECIES.has(
      details?.species?.name || details?.name || key
    ),
    evolution,
    types: details?.types || [],
    stats: details?.stats || [],
    bio: chooseFlavorText(species?.flavor_text_entries || []),
    images,
    thumb
  };
};

export const fetchGenerationRosterEntries = async (
  genId: number
): Promise<GenerationRosterEntry[]> => {
  if (genRosterEntryCache.has(genId)) return genRosterEntryCache.get(genId)!;
  const generation = await fetchJson<any>(`generation/${genId}`);
  const entries = Array.from(
    new Map(
      (generation?.pokemon_species || [])
        .map((entry: any) => {
          const name = String(entry?.name || "");
          if (!name) return null;
          return [
            name,
            {
              id: getResourceId(entry?.url),
              name,
              generation: genId
            } satisfies GenerationRosterEntry
          ] as const;
        })
        .filter(Boolean) as Array<readonly [string, GenerationRosterEntry]>
    ).values()
  ).sort((a, b) => {
    const idOrder =
      (Number.isFinite(a.id) ? Number(a.id) : Number.MAX_SAFE_INTEGER) -
      (Number.isFinite(b.id) ? Number(b.id) : Number.MAX_SAFE_INTEGER);
    if (idOrder !== 0) return idOrder;
    return a.name.localeCompare(b.name);
  });

  genRosterEntryCache.set(genId, entries);
  genRosterCache.set(
    genId,
    entries.map((entry) => entry.name)
  );
  return entries;
};

export const fetchGenerationRoster = async (genId: number): Promise<string[]> => {
  if (genRosterCache.has(genId)) return genRosterCache.get(genId)!;
  const entries = await fetchGenerationRosterEntries(genId);
  const names = entries.map((entry) => entry.name);
  genRosterCache.set(genId, names);
  return names;
};

export const fetchTypeIndex = async (type: PokemonTypeName): Promise<Set<string>> => {
  if (typeIndexCache.has(type)) return typeIndexCache.get(type)!;
  const data = await fetchJson<any>(`type/${type}`);
  const names = new Set<string>(
    (data?.pokemon || [])
      .map((entry: any) => String(entry?.pokemon?.name || ""))
      .filter((name: string) => Boolean(name))
  );

  const aliasEntries = await Promise.all(
    Array.from(names)
      .filter((name) => name.includes("-"))
      .map(async (name) => {
        try {
          const details = await loadPokemonDetails(name);
          return String(details?.species?.name || "").trim().toLowerCase();
        } catch {
          return "";
        }
      })
  );

  aliasEntries.filter(Boolean).forEach((name) => names.add(name));
  typeIndexCache.set(type, names);
  return names;
};

export const fetchMove = async (moveNameOrId: string | number) => {
  const key = String(moveNameOrId).toLowerCase();
  return fetchJson<any>(`move/${key}`);
};
