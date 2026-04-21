import { afterEach, describe, expect, it } from "vitest";
import { getPreferredAppThemeMode, parseAppThemeMode } from "@/lib/theme";

describe("theme", () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  describe("parseAppThemeMode", () => {
    it("accepts dark mode", () => {
      expect(parseAppThemeMode("dark")).toBe("dark");
    });

    it("falls back to light mode for unknown values", () => {
      expect(parseAppThemeMode("system")).toBe("light");
      expect(parseAppThemeMode(null)).toBe("light");
    });
  });

  describe("getPreferredAppThemeMode", () => {
    it("defaults to light when matchMedia is unavailable", () => {
      expect(getPreferredAppThemeMode()).toBe("light");
    });

    it("returns dark when the system preference is dark", () => {
      (globalThis as any).window = {
        matchMedia: (query: string) => ({
          matches: query === "(prefers-color-scheme: dark)"
        })
      };

      expect(getPreferredAppThemeMode()).toBe("dark");
    });
  });
});
