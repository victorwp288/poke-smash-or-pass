import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pokeapi/client", () => ({
  fetchJson: vi.fn()
}));

import { fetchJson } from "@/lib/pokeapi/client";
import {
  fetchPokemon,
  fetchTypeIndex,
  getDefaultPokemonRequestKey
} from "@/lib/pokeapi/api";

const mockedFetchJson = vi.mocked(fetchJson);

describe("getDefaultPokemonRequestKey", () => {
  it("prefers the default variety when present", () => {
    expect(
      getDefaultPokemonRequestKey({
        name: "meowstic",
        varieties: [
          { is_default: false, pokemon: { name: "meowstic-female" } },
          { is_default: true, pokemon: { name: "meowstic-male" } }
        ]
      })
    ).toBe("meowstic-male");
  });

  it("falls back to the species name when no varieties exist", () => {
    expect(getDefaultPokemonRequestKey({ name: "pikachu" })).toBe("pikachu");
  });
});

describe("fetchPokemon", () => {
  beforeEach(() => {
    mockedFetchJson.mockReset();
  });

  it("falls back from a species name to the default pokemon variety", async () => {
    mockedFetchJson.mockImplementation(async (path: string) => {
      if (path === "pokemon/meowstic") {
        throw new Error("404");
      }

      if (path === "pokemon-species/meowstic") {
        return {
          name: "meowstic",
          color: { name: "blue" },
          habitat: { name: "urban" },
          evolution_chain: { url: "" },
          flavor_text_entries: [],
          varieties: [
            {
              is_default: true,
              pokemon: { name: "meowstic-male" }
            }
          ]
        };
      }

      if (path === "pokemon/meowstic-male") {
        return {
          id: 678,
          name: "meowstic-male",
          species: { name: "meowstic" },
          height: 6,
          weight: 85,
          types: [{ slot: 1, type: { name: "psychic" } }],
          stats: [],
          abilities: [],
          cries: {},
          sprites: {
            front_default: "thumb.png",
            other: {}
          }
        };
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    const pokemon = await fetchPokemon("meowstic");

    expect(pokemon.id).toBe(678);
    expect(pokemon.rawName).toBe("meowstic");
    expect(pokemon.name).toBe("Meowstic");
    expect(mockedFetchJson).toHaveBeenCalledWith("pokemon/meowstic");
    expect(mockedFetchJson).toHaveBeenCalledWith("pokemon-species/meowstic");
    expect(mockedFetchJson).toHaveBeenCalledWith("pokemon/meowstic-male");
  });
});

describe("fetchTypeIndex", () => {
  beforeEach(() => {
    mockedFetchJson.mockReset();
  });

  it("adds the species alias for default-form pokemon names", async () => {
    mockedFetchJson.mockImplementation(async (path: string) => {
      if (path === "type/psychic") {
        return {
          pokemon: [
            {
              pokemon: { name: "meowstic-male" }
            }
          ]
        };
      }

      if (path === "pokemon/meowstic-male") {
        return {
          species: { name: "meowstic" }
        };
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    const names = await fetchTypeIndex("psychic");

    expect(names.has("meowstic-male")).toBe(true);
    expect(names.has("meowstic")).toBe(true);
  });
});
