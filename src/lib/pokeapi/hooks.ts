import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppLocale } from "@/lib/i18n/it";
import {
  fetchGenerationRoster,
  fetchGenerationRosterEntries,
  fetchPokemon,
  fetchTypeIndex,
  type GenerationRosterEntry
} from "@/lib/pokeapi/api";
import {
  fetchPokemonForms,
  fetchPokemonMoveSpotlight
} from "@/lib/pokeapi/context";
import type {
  Pokemon,
  PokemonFormOption,
  PokemonMoveSpotlight
} from "@/lib/pokeapi/types";
import type { PokemonTypeName } from "@/lib/typeChart";

export const GENERATION_ROSTER_ENTRIES_STALE_MS = 1000 * 60 * 60 * 24;
export const POKEMON_CONTEXT_STALE_MS = 1000 * 60 * 60 * 24 * 7;

export const getGenerationRosterEntriesQueryOptions = (
  genId: number,
  staleTime = GENERATION_ROSTER_ENTRIES_STALE_MS
) => ({
  queryKey: ["generation-roster-entries", genId] as const,
  queryFn: () => fetchGenerationRosterEntries(genId),
  staleTime
});

export const usePokemon = (
  nameOrId: string | number,
  locale: AppLocale,
  enabled = true
) => {
  const key = String(nameOrId).toLowerCase();
  return useQuery({
    queryKey: ["pokemon", key, locale],
    queryFn: () => fetchPokemon(key, locale),
    enabled: Boolean(key) && enabled
  });
};

export const usePokemonForms = (
  speciesName: string | number,
  locale: AppLocale,
  enabled = true
) => {
  const key = String(speciesName).toLowerCase();
  return useQuery({
    queryKey: ["pokemon-forms", key, locale],
    queryFn: () => fetchPokemonForms(key, locale),
    staleTime: POKEMON_CONTEXT_STALE_MS,
    enabled: Boolean(key) && enabled
  });
};

export const usePokemonMoveSpotlight = (
  nameOrId: string | number,
  locale: AppLocale,
  enabled = true
) => {
  const key = String(nameOrId).toLowerCase();
  return useQuery({
    queryKey: ["pokemon-move-spotlight", key, locale],
    queryFn: () => fetchPokemonMoveSpotlight(key, locale),
    staleTime: POKEMON_CONTEXT_STALE_MS,
    enabled: Boolean(key) && enabled
  });
};

export const useGenerationRoster = (genId: number) => {
  return useQuery({
    queryKey: ["generation-roster", genId],
    queryFn: () => fetchGenerationRoster(genId),
    enabled: Number.isFinite(genId) && genId > 0
  });
};

export const useTypeIndex = (type: PokemonTypeName) => {
  return useQuery({
    queryKey: ["type-index", type],
    queryFn: () => fetchTypeIndex(type),
    enabled: Boolean(type)
  });
};

export const usePrefetchPokemon = () => {
  const client = useQueryClient();
  return (nameOrId: string | number, locale: AppLocale) => {
    const key = String(nameOrId).toLowerCase();
    if (!key) return;
    client.prefetchQuery({
      queryKey: ["pokemon", key, locale],
      queryFn: () => fetchPokemon(key, locale)
    });
  };
};

export const getCachedPokemon = (
  client: QueryClient,
  nameOrId: string,
  locale: AppLocale
) => {
  const key = String(nameOrId).toLowerCase();
  return client.getQueryData<Pokemon>(["pokemon", key, locale]) || null;
};

export const getCachedPokemonForms = (
  client: QueryClient,
  speciesName: string,
  locale: AppLocale
) => {
  const key = String(speciesName).toLowerCase();
  return (
    client.getQueryData<PokemonFormOption[]>(["pokemon-forms", key, locale]) ||
    null
  );
};

export const getCachedPokemonMoveSpotlight = (
  client: QueryClient,
  nameOrId: string,
  locale: AppLocale
) => {
  const key = String(nameOrId).toLowerCase();
  return (
    client.getQueryData<PokemonMoveSpotlight[]>([
      "pokemon-move-spotlight",
      key,
      locale
    ]) || null
  );
};

export const getCachedGenerationRosterEntries = (
  client: QueryClient,
  genId: number
) =>
  client.getQueryData<GenerationRosterEntry[]>(
    getGenerationRosterEntriesQueryOptions(genId).queryKey
  ) || null;

export const prefetchGenerationRosterEntries = (
  client: QueryClient,
  genId: number,
  staleTime = GENERATION_ROSTER_ENTRIES_STALE_MS
) =>
  client.prefetchQuery(
    getGenerationRosterEntriesQueryOptions(genId, staleTime)
  );
