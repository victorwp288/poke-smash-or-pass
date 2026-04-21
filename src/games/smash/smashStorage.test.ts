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
    expect(
      parseOptions({
        autoReveal: false,
        shinyMode: true,
        dailyDeck: true,
        onlyMega: true,
        keepHistory: false
      }).playSoloMode
    ).toBe(false);
  });

  it("reads an explicit smash or pass mode value", () => {
    expect(parseOptions({ smashPassMode: false }).smashPassMode).toBe(false);
  });

  it("defaults play solo mode to disabled", () => {
    expect(defaultOptions().playSoloMode).toBe(false);
  });

  it("reads an explicit play solo mode value", () => {
    expect(parseOptions({ playSoloMode: true }).playSoloMode).toBe(true);
  });
});
