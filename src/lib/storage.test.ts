import { beforeEach, describe, expect, it } from "vitest";
import { readJson, writeJson } from "@/lib/storage";

const createLocalStorage = () => {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
};

describe("storage", () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createLocalStorage();
  });

  describe("readJson", () => {
    it("returns fallback for empty key", () => {
      expect(readJson("", { ok: true })).toEqual({ ok: true });
    });

    it("returns fallback when key missing", () => {
      expect(readJson("missing", 123)).toBe(123);
    });

    it("returns fallback when JSON parse fails", () => {
      localStorage.setItem("bad", "{nope");
      expect(readJson("bad", { fallback: true })).toEqual({ fallback: true });
    });

    it("returns fallback when localStorage throws", () => {
      (globalThis as any).localStorage = {
        getItem() {
          throw new Error("blocked");
        }
      };
      expect(readJson("any", "fallback")).toBe("fallback");
    });
  });

  describe("writeJson", () => {
    it("no-ops for empty key", () => {
      expect(() => writeJson("", { ok: true })).not.toThrow();
    });

    it("writes JSON value", () => {
      writeJson("key", { a: 1 });
      expect(localStorage.getItem("key")).toBe(JSON.stringify({ a: 1 }));
    });

    it("swallows localStorage errors", () => {
      (globalThis as any).localStorage = {
        setItem() {
          throw new Error("quota");
        }
      };
      expect(() => writeJson("key", { ok: true })).not.toThrow();
    });
  });
});

