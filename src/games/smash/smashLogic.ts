import { clamp } from "@/lib/text";

export const shuffle = <T>(items: T[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export const seedFromDate = () => {
  const today = new Date();
  const key = today.toISOString().slice(0, 10);
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const seededShuffle = <T>(items: T[], seed: number) => {
  const copy = [...items];
  let value = seed;
  const random = () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const getSpriteScale = (heightDecimeters: number) => {
  const height = Math.max(1, Number(heightDecimeters) || 10);
  const scaled = 1.12 - Math.log10(height) * 0.28;
  return clamp(scaled, 0.62, 1.02);
};

