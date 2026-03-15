import { describe, expect, it } from "vitest";
import { defaultOptions, parseOptions } from "@/games/smash/smashStorage";

describe("smashStorage options", () => {
  it("defaults smash or pass mode to enabled", () => {
    expect(defaultOptions().smashPassMode).toBe(true);
  });

  it("keeps smash or pass mode enabled for older saved settings", () => {
    expect(
      parseOptions({
        autoReveal: false,
        shinyMode: true,
        dailyDeck: true,
        onlyMega: true,
        keepHistory: false
      }).smashPassMode
    ).toBe(true);
  });

  it("reads an explicit smash or pass mode value", () => {
    expect(parseOptions({ smashPassMode: false }).smashPassMode).toBe(false);
  });
});
