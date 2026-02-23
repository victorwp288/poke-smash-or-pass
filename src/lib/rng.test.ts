import { afterEach, describe, expect, it, vi } from "vitest";
import { dateSeed, seededRng } from "@/lib/rng";

describe("seededRng", () => {
  it("produces deterministic output for the same seed", () => {
    const a = seededRng(123);
    const b = seededRng(123);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces values in [0, 1)", () => {
    const rng = seededRng(999);
    for (let i = 0; i < 20; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("dateSeed", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats UTC date as YYYYMMDD", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-02T12:00:00.000Z"));
    expect(dateSeed()).toBe(20250102);
  });
});

