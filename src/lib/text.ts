export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const capitalize = (text = "") =>
  text
    .split("-")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");

export const normalizeInlineText = (value: unknown) =>
  String(value ?? "")
    .replace(/[\f\n\r]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const formatId = (id: number) => `#${String(id || 0).padStart(4, "0")}`;

export const normalizeGuessToken = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
