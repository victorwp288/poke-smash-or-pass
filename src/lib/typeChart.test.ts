import { describe, expect, it } from "vitest";
import { TYPE_LIST, typeEffectiveness } from "@/lib/typeChart";

describe("typeEffectiveness", () => {
  it("returns neutral (1) for empty defenders", () => {
    expect(typeEffectiveness("fire", [])).toBe(1);
  });

  it("handles immunities and multipliers", () => {
    expect(typeEffectiveness("electric", ["water"])).toBe(2);
    expect(typeEffectiveness("electric", ["ground"])).toBe(0);
    expect(typeEffectiveness("ghost", ["normal"])).toBe(0);
    expect(typeEffectiveness("fire", ["grass", "steel"])).toBe(4);
  });

  it("accepts PokeAPI type objects", () => {
    expect(typeEffectiveness("water", [{ type: { name: "fire" } }])).toBe(2);
  });
});

describe("TYPE_LIST", () => {
  it("includes all 18 types", () => {
    expect(TYPE_LIST).toHaveLength(18);
    expect(TYPE_LIST).toContain("fire");
    expect(TYPE_LIST).toContain("fairy");
  });
});

