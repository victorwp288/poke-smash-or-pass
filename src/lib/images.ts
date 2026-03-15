import type { Pokemon } from "@/lib/pokeapi/types";

const loadedImageUrls = new Set<string>();
const pendingImageLoads = new Map<string, Promise<void>>();

const uniqueUrls = (urls: Array<string | null | undefined>) =>
  Array.from(
    new Set(
      urls
        .map((url) => String(url || "").trim())
        .filter(Boolean)
    )
  );

export const preloadImage = (url: string) => {
  const src = String(url || "").trim();
  if (!src || loadedImageUrls.has(src)) {
    return Promise.resolve();
  }

  const existing = pendingImageLoads.get(src);
  if (existing) return existing;

  let resolveRequest = () => {};
  const request = new Promise<void>((resolve) => {
    resolveRequest = resolve;
  });
  pendingImageLoads.set(src, request);

  const img = new Image();
  let settled = false;

  const finish = (didLoad: boolean) => {
    if (settled) return;
    settled = true;
    if (didLoad) {
      loadedImageUrls.add(src);
    }
    pendingImageLoads.delete(src);
    resolveRequest();
  };

  img.decoding = "async";
  img.onload = () => finish(true);
  img.onerror = () => finish(false);
  img.src = src;

  if (img.complete && img.naturalWidth > 0) {
    finish(true);
  }

  return request;
};

export const preloadImages = (urls: Array<string | null | undefined>) => {
  uniqueUrls(urls).forEach((url) => {
    void preloadImage(url);
  });
};

export const collectPokemonImageUrls = (pokemon: Pokemon | null) => {
  if (!pokemon) return [] as string[];

  const evolutionSprites = pokemon.evolution
    .flat()
    .map((entry) => entry?.sprite);

  return uniqueUrls([
    pokemon.images.main,
    pokemon.images.shiny,
    pokemon.thumb,
    ...pokemon.images.gallery,
    ...evolutionSprites
  ]);
};
