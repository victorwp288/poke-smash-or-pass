import { describe, expect, it } from "vitest";
import type { Pokemon } from "@/lib/pokeapi/types";
import { compareGuessPokemon, formatGuessDirection, humanizeTypeList } from "@/games/guess/guessLogic";

const BASE_POKEMON: Pokemon = {
  id: 1,
  rawName: "bulbasaur",
  name: "Bulbasaur",
  generation: 1,
  height: 7,
  weight: 69,
  typeNames: ["grass", "poison"],
  baseStatTotal: 318,
  category: "standard",
  categoryTags: [],
  speciesColor: "green",
  habitat: "grassland",
  nameLength: 9,
  abilities: [],
  cry: "",
  canMegaEvolve: false,
  evolution: [],
  types: [{ type: { name: "grass" } }],
  stats: [],
  bio: "",
  images: { main: "", shiny: "", gallery: [] },
  thumb: ""
};

const makePokemon = (overrides: Partial<Pokemon>): Pokemon => ({
  ...BASE_POKEMON,
  ...overrides,
  typeNames: overrides.typeNames ?? BASE_POKEMON.typeNames,
  categoryTags: overrides.categoryTags ?? BASE_POKEMON.categoryTags,
  abilities: overrides.abilities ?? BASE_POKEMON.abilities,
  evolution: overrides.evolution ?? BASE_POKEMON.evolution,
  types: overrides.types ?? BASE_POKEMON.types,
  stats: overrides.stats ?? BASE_POKEMON.stats,
  images: overrides.images ?? BASE_POKEMON.images
});

describe("humanizeTypeList", () => {
  it("formats an empty list as Unknown", () => {
    expect(humanizeTypeList([])).toBe("Unknown");
  });

  it("formats types in a human readable list", () => {
    expect(humanizeTypeList(["fire", "flying"])).toBe("Fire / Flying");
  });
});

describe("formatGuessDirection", () => {
  it("returns exact when values match", () => {
    const cell = formatGuessDirection(10, 10, (value) => String(value));
    expect(cell.state).toBe("exact");
    expect(cell.label).toBe("10");
  });

  it("returns direction arrow when values differ", () => {
    const cell = formatGuessDirection(1, 3, (value) => `Gen ${value}`);
    expect(cell.state).toBe("direction");
    expect(cell.label).toContain("↑");
  });
});

describe("compareGuessPokemon", () => {
  it("marks exact match when name matches", () => {
    const guess = makePokemon({ rawName: "pikachu", name: "Pikachu" });
    const target = makePokemon({ rawName: "pikachu", name: "Pikachu" });
    const row = compareGuessPokemon(guess, target);
    expect(row.isCorrect).toBe(true);
    expect(row.cells.name.state).toBe("exact");
    expect(row.cells.type.state).toBe("exact");
    expect(row.cells.category.state).toBe("exact");
  });

  it("marks partial typing when sharing at least one type", () => {
    const guess = makePokemon({
      rawName: "charizard",
      name: "Charizard",
      typeNames: ["fire", "flying"]
    });
    const target = makePokemon({
      rawName: "vulpix",
      name: "Vulpix",
      typeNames: ["fire"]
    });
    const row = compareGuessPokemon(guess, target);
    expect(row.isCorrect).toBe(false);
    expect(row.cells.type.state).toBe("partial");
  });
});

