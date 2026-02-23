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
const typeIndexCache = new Map<PokemonTypeName, Set<string>>();

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

const loadEvolutionLine = async (chainUrl: string | undefined) => {
  if (!chainUrl) return [];
  if (evolutionChainCache.has(chainUrl)) return evolutionChainCache.get(chainUrl)!;

  try {
    const chain = await fetchJson<any>(chainUrl);
    const stages = normalizeEvolutionChain(chain);
    evolutionChainCache.set(chainUrl, stages);
    return stages;
  } catch {
    evolutionChainCache.set(chainUrl, []);
    return [];
  }
};

export const fetchPokemon = async (nameOrId: string | number): Promise<Pokemon> => {
  const key = String(nameOrId).toLowerCase();
  const [details, species] = await Promise.all([
    fetchJson<any>(`pokemon/${key}`),
    fetchJson<any>(`pokemon-species/${key}`)
  ]);

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
  const typeNames: PokemonTypeName[] = (details?.types || [])
    .slice()
    .sort((a: any, b: any) => (a?.slot || 0) - (b?.slot || 0))
    .map((entry: any) => entry?.type?.name)
    .filter(Boolean);

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
    rawName: String(details?.name || key),
    name: capitalize(String(details?.name || key)),
    generation,
    height: Number(details?.height) || 0,
    weight: Number(details?.weight) || 0,
    typeNames,
    baseStatTotal,
    category: getPrimaryCategory(species),
    speciesColor: species?.color?.name || "unknown",
    habitat: species?.habitat?.name || "unknown",
    nameLength: String(details?.name || "").length,
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

export const fetchGenerationRoster = async (genId: number): Promise<string[]> => {
  if (genRosterCache.has(genId)) return genRosterCache.get(genId)!;
  const generation = await fetchJson<any>(`generation/${genId}`);
  const names: string[] = (generation?.pokemon_species || [])
    .map((entry: any) => String(entry?.name || ""))
    .filter((name: string) => Boolean(name));

  const uniqueNames = Array.from(new Set(names));
  genRosterCache.set(genId, uniqueNames);
  return uniqueNames;
};

export const fetchTypeIndex = async (type: PokemonTypeName): Promise<Set<string>> => {
  if (typeIndexCache.has(type)) return typeIndexCache.get(type)!;
  const data = await fetchJson<any>(`type/${type}`);
  const names = new Set<string>(
    (data?.pokemon || [])
      .map((entry: any) => String(entry?.pokemon?.name || ""))
      .filter((name: string) => Boolean(name))
  );
  typeIndexCache.set(type, names);
  return names;
};

export const fetchMove = async (moveNameOrId: string | number) => {
  const key = String(moveNameOrId).toLowerCase();
  return fetchJson<any>(`move/${key}`);
};
