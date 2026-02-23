import { POKEAPI_BASE_URL } from "@/lib/constants";

type FetchJsonOptions = {
  signal?: AbortSignal;
};

const toAbsolute = (pathOrUrl: string) =>
  String(pathOrUrl).startsWith("http")
    ? pathOrUrl
    : `${POKEAPI_BASE_URL}/${String(pathOrUrl).replace(/^\/+/, "")}`;

export const fetchJson = async <T>(
  pathOrUrl: string,
  options: FetchJsonOptions = {}
) => {
  const url = toAbsolute(pathOrUrl);
  const response = await fetch(url, { signal: options.signal });
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
};

