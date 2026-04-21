import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pokeapi/client", () => ({
  fetchJson: vi.fn()
}));

import { fetchJson } from "@/lib/pokeapi/client";
import {
  describePokemonForm,
  fetchPokemonMoveSpotlight,
  selectMoveSpotlight
} from "@/lib/pokeapi/context";

const mockedFetchJson = vi.mocked(fetchJson);

describe("describePokemonForm", () => {
  it("recognizes regional forms", () => {
    expect(describePokemonForm("raichu-alola", "raichu", "en")).toEqual(
      expect.objectContaining({
        label: "Alola",
        isRegional: true,
        isMega: false
      })
    );
  });

  it("localizes common form labels", () => {
    expect(
      describePokemonForm("meowstic-male", "meowstic", "it", true)
    ).toEqual(
      expect.objectContaining({
        label: "Maschio",
        isDefault: true
      })
    );
  });
});

describe("selectMoveSpotlight", () => {
  it("prioritizes stab, coverage, and utility before a flex slot", () => {
    const spotlight = selectMoveSpotlight([
      {
        name: "psychic",
        label: "Psychic",
        type: "psychic",
        damageClass: "special",
        power: 90,
        accuracy: 100,
        pp: 10,
        priority: 0,
        shortEffect: "May lower Sp. Def.",
        learnMethod: "level-up",
        levelLearnedAt: 42,
        isStab: true
      },
      {
        name: "shadow-ball",
        label: "Shadow Ball",
        type: "ghost",
        damageClass: "special",
        power: 80,
        accuracy: 100,
        pp: 15,
        priority: 0,
        shortEffect: "May lower Sp. Def.",
        learnMethod: "machine",
        levelLearnedAt: null,
        isStab: false
      },
      {
        name: "calm-mind",
        label: "Calm Mind",
        type: "psychic",
        damageClass: "status",
        power: null,
        accuracy: null,
        pp: 20,
        priority: 0,
        shortEffect: "Raises Sp. Atk and Sp. Def.",
        learnMethod: "level-up",
        levelLearnedAt: 34,
        isStab: true
      },
      {
        name: "quick-attack",
        label: "Quick Attack",
        type: "normal",
        damageClass: "physical",
        power: 40,
        accuracy: 100,
        pp: 30,
        priority: 1,
        shortEffect: "Usually goes first.",
        learnMethod: "level-up",
        levelLearnedAt: 1,
        isStab: false
      }
    ]);

    expect(spotlight.map((move) => move.name)).toEqual([
      "psychic",
      "shadow-ball",
      "calm-mind",
      "quick-attack"
    ]);
  });
});

describe("fetchPokemonMoveSpotlight", () => {
  beforeEach(() => {
    mockedFetchJson.mockReset();
  });

  it("falls back from a species name to its default variety when building spotlight data", async () => {
    mockedFetchJson.mockImplementation(async (path: string) => {
      if (path === "pokemon/meowstic") {
        throw new Error("404");
      }

      if (path === "pokemon-species/meowstic") {
        return {
          name: "meowstic",
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
          types: [{ slot: 1, type: { name: "psychic" } }],
          moves: [
            {
              move: { name: "psychic" },
              version_group_details: [
                {
                  level_learned_at: 42,
                  move_learn_method: { name: "level-up" }
                }
              ]
            },
            {
              move: { name: "shadow-ball" },
              version_group_details: [
                {
                  level_learned_at: 0,
                  move_learn_method: { name: "machine" }
                }
              ]
            },
            {
              move: { name: "calm-mind" },
              version_group_details: [
                {
                  level_learned_at: 34,
                  move_learn_method: { name: "level-up" }
                }
              ]
            }
          ]
        };
      }

      if (path === "move/psychic") {
        return {
          name: "psychic",
          names: [{ name: "Psychic", language: { name: "en" } }],
          type: { name: "psychic" },
          damage_class: { name: "special" },
          power: 90,
          accuracy: 100,
          pp: 10,
          priority: 0,
          effect_entries: [
            {
              short_effect: "May lower the target's Sp. Def.",
              language: { name: "en" }
            }
          ]
        };
      }

      if (path === "move/shadow-ball") {
        return {
          name: "shadow-ball",
          names: [{ name: "Shadow Ball", language: { name: "en" } }],
          type: { name: "ghost" },
          damage_class: { name: "special" },
          power: 80,
          accuracy: 100,
          pp: 15,
          priority: 0,
          effect_entries: [
            {
              short_effect: "May lower the target's Sp. Def.",
              language: { name: "en" }
            }
          ]
        };
      }

      if (path === "move/calm-mind") {
        return {
          name: "calm-mind",
          names: [{ name: "Calm Mind", language: { name: "en" } }],
          type: { name: "psychic" },
          damage_class: { name: "status" },
          power: null,
          accuracy: null,
          pp: 20,
          priority: 0,
          effect_entries: [
            {
              short_effect: "Raises the user's Sp. Atk and Sp. Def.",
              language: { name: "en" }
            }
          ]
        };
      }

      throw new Error(`Unexpected request: ${path}`);
    });

    const spotlight = await fetchPokemonMoveSpotlight("meowstic");

    expect(spotlight.map((move) => move.name)).toEqual([
      "psychic",
      "shadow-ball",
      "calm-mind"
    ]);
    expect(mockedFetchJson).toHaveBeenCalledWith("pokemon/meowstic");
    expect(mockedFetchJson).toHaveBeenCalledWith("pokemon-species/meowstic");
    expect(mockedFetchJson).toHaveBeenCalledWith("pokemon/meowstic-male");
  });
});
