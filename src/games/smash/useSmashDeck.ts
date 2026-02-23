import React from "react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { MEGA_EVOLUTION_SPECIES } from "@/lib/constants";
import { fetchGenerationRoster, fetchPokemon, fetchTypeIndex } from "@/lib/pokeapi/api";
import type { Pokemon } from "@/lib/pokeapi/types";
import { TYPE_LIST, type PokemonTypeName } from "@/lib/typeChart";
import { seededShuffle, seedFromDate, shuffle } from "@/games/smash/smashLogic";
import type { SmashFiltersStorage, SmashOptionsStorage } from "@/games/smash/smashTypes";

const DAILY_SIZE = 20;
const PRELOAD_COUNT = 2;

const unique = <T,>(items: T[]) => Array.from(new Set(items));

const preloadImages = (urls: string[]) => {
  urls.forEach((url) => {
    if (!url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
  });
};

const getDeckLabel = (dailyDeck: boolean) => (dailyDeck ? "Daily deck" : "Deck");

const buildTypeAllowedSet = async (
  queryClient: QueryClient,
  types: PokemonTypeName[]
) => {
  const sets = await Promise.all(
    types.map((type) =>
      queryClient.fetchQuery<Set<string>>({
        queryKey: ["type-index", type],
        queryFn: () => fetchTypeIndex(type)
      })
    )
  );
  const allowed = new Set<string>();
  sets.forEach((set) => {
    set.forEach((name) => allowed.add(name));
  });
  return allowed;
};

type SmashDeckState = {
  queue: string[];
  currentPokemon: Pokemon | null;
  statusText: string;
};

type SmashDeckApi = SmashDeckState & {
  rebuildQueue: () => Promise<void>;
  loadNext: () => Promise<void>;
  prependToQueue: (name: string) => void;
  setCurrentPokemon: (pokemon: Pokemon | null) => void;
};

export const useSmashDeck = ({
  filters,
  options
}: {
  filters: SmashFiltersStorage;
  options: SmashOptionsStorage;
}): SmashDeckApi => {
  const queryClient = useQueryClient();
  const tokenRef = React.useRef(0);
  const queueRef = React.useRef<string[]>([]);

  const [queue, setQueueState] = React.useState<string[]>([]);
  const [currentPokemon, setCurrentPokemon] = React.useState<Pokemon | null>(null);
  const [statusText, setStatusText] = React.useState<string>("Loading roster...");

  const deckLabel = getDeckLabel(options.dailyDeck);

  const setQueue = React.useCallback((next: string[]) => {
    queueRef.current = next;
    setQueueState(next);
  }, []);

  const updateDeckStatus = React.useCallback(() => {
    setStatusText(`${deckLabel}: ${queueRef.current.length} left`);
  }, [deckLabel]);

  const prefetchUpcoming = React.useCallback(
    async (token: number) => {
      const upcoming = queueRef.current.slice(0, PRELOAD_COUNT);
      await Promise.all(
        upcoming.map(async (name) => {
          try {
            const key = String(name).toLowerCase();
            const pokemon = await queryClient.fetchQuery<Pokemon>({
              queryKey: ["pokemon", key],
              queryFn: () => fetchPokemon(key)
            });
            if (token !== tokenRef.current) return;
            preloadImages(pokemon.images.gallery);
          } catch {
            // ignore preload failures
          }
        })
      );
    },
    [queryClient]
  );

  const loadNext = React.useCallback(async () => {
    const token = tokenRef.current;
    while (true) {
      const nextQueue = queueRef.current;
      if (nextQueue.length === 0) {
        setCurrentPokemon(null);
        setStatusText("Deck empty - pick more generations.");
        return;
      }

      const nextName = nextQueue.shift();
      setQueue([...nextQueue]);
      updateDeckStatus();

      try {
        const key = String(nextName).toLowerCase();
        const pokemon = await queryClient.fetchQuery<Pokemon>({
          queryKey: ["pokemon", key],
          queryFn: () => fetchPokemon(key)
        });
        if (token !== tokenRef.current) return;
        setCurrentPokemon(pokemon);
        void prefetchUpcoming(token);
        return;
      } catch {
        if (token !== tokenRef.current) return;
        continue;
      }
    }
  }, [prefetchUpcoming, queryClient, setQueue, updateDeckStatus]);

  const rebuildQueue = React.useCallback(async () => {
    const token = ++tokenRef.current;
    setCurrentPokemon(null);
    setQueue([]);
    setStatusText("Fetching roster...");

    const genIds = unique(filters.gens).filter((genId) => genId >= 1 && genId <= 9);
    if (genIds.length === 0) {
      setStatusText("Deck empty - pick more generations.");
      return;
    }

    try {
      const rosters = await Promise.all(
        genIds
          .slice()
          .sort((a, b) => a - b)
          .map((genId) =>
            queryClient.fetchQuery<string[]>({
              queryKey: ["generation-roster", genId],
              queryFn: () => fetchGenerationRoster(genId)
            })
          )
      );
      if (token !== tokenRef.current) return;

      let names = unique(rosters.flat());

      const selectedTypes = unique(filters.types);
      if (selectedTypes.length === 0) {
        names = [];
      } else if (selectedTypes.length < TYPE_LIST.length) {
        const allowed = await buildTypeAllowedSet(queryClient, selectedTypes);
        if (token !== tokenRef.current) return;
        names = names.filter((name) => allowed.has(name));
      }

      if (options.onlyMega) {
        names = names.filter((name) => MEGA_EVOLUTION_SPECIES.has(name));
      }

      const deck = options.dailyDeck
        ? seededShuffle(names, seedFromDate()).slice(0, DAILY_SIZE)
        : shuffle(names);

      if (token !== tokenRef.current) return;
      setQueue(deck);
      await loadNext();
    } catch {
      if (token !== tokenRef.current) return;
      setQueue([]);
      setCurrentPokemon(null);
      setStatusText("Deck empty - pick more generations.");
    }
  }, [filters.gens, filters.types, loadNext, options.dailyDeck, options.onlyMega, queryClient, setQueue]);

  const prependToQueue = React.useCallback(
    (name: string) => {
      if (!name) return;
      const next = [name, ...queueRef.current];
      setQueue(next);
      updateDeckStatus();
    },
    [setQueue, updateDeckStatus]
  );

  return {
    queue,
    currentPokemon,
    statusText,
    rebuildQueue,
    loadNext,
    prependToQueue,
    setCurrentPokemon
  };
};
