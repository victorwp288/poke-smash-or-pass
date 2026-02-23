import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchGenerationRoster, fetchPokemon, fetchTypeIndex } from "@/lib/pokeapi/api";
import type { Pokemon } from "@/lib/pokeapi/types";
import type { PokemonTypeName } from "@/lib/typeChart";

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
