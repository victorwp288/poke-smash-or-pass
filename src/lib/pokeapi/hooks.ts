import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchGenerationRoster,
  fetchGenerationRosterEntries,
  fetchPokemon,
  fetchTypeIndex,
  type GenerationRosterEntry
} from "@/lib/pokeapi/api";
import type { Pokemon } from "@/lib/pokeapi/types";
import type { PokemonTypeName } from "@/lib/typeChart";

export const GENERATION_ROSTER_ENTRIES_STALE_MS = 1000 * 60 * 60 * 24;

export const getGenerationRosterEntriesQueryOptions = (
  genId: number,
  staleTime = GENERATION_ROSTER_ENTRIES_STALE_MS
) => ({
  queryKey: ["generation-roster-entries", genId] as const,
  queryFn: () => fetchGenerationRosterEntries(genId),
  staleTime
});

export const usePokemon = (nameOrId: string | number) => {
  const key = String(nameOrId).toLowerCase();
  return useQuery({
    queryKey: ["pokemon", key],
    queryFn: () => fetchPokemon(key),
    enabled: Boolean(key)
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
  return (nameOrId: string | number) => {
    const key = String(nameOrId).toLowerCase();
    if (!key) return;
    client.prefetchQuery({
      queryKey: ["pokemon", key],
      queryFn: () => fetchPokemon(key)
    });
  };
};

export const getCachedPokemon = (client: QueryClient, nameOrId: string) => {
  const key = String(nameOrId).toLowerCase();
  return client.getQueryData<Pokemon>(["pokemon", key]) || null;
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
  client.prefetchQuery(getGenerationRosterEntriesQueryOptions(genId, staleTime));
