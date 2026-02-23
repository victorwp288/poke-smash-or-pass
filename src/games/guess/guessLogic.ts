import { CATEGORY_LABELS } from "@/lib/constants";
import { capitalize } from "@/lib/text";
import type { Pokemon } from "@/lib/pokeapi/types";

export const GUESS_MAX_ATTEMPTS = 6;

export type GuessCellState = "exact" | "partial" | "direction" | "miss";

export type GuessCell = {
  state: GuessCellState;
  label: string;
};

export type GuessFeedbackRow = {
  rawName: string;
  isCorrect: boolean;
  cells: {
    name: GuessCell;
    generation: GuessCell;
    type: GuessCell;
    height: GuessCell;
    weight: GuessCell;
    bst: GuessCell;
    category: GuessCell;
  };
};

export type GuessClue = { id: string; label: string; value: string };

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const humanizeTypeList = (types: string[]) => {
  if (!Array.isArray(types) || !types.length) return "Unknown";
  return types.map((type) => capitalize(type)).join(" / ");
};

export const formatMeters = (decimeters: number) =>
  Number.isFinite(decimeters) ? (decimeters / 10).toFixed(1) : "?";

export const formatKilograms = (hectograms: number) =>
  Number.isFinite(hectograms) ? (hectograms / 10).toFixed(1) : "?";

export const formatGuessDirection = (
  guessValue: number | null,
  targetValue: number | null,
  formatValue: (value: number | null) => string
): GuessCell => {
  if (guessValue == null || targetValue == null) {
    return { state: "miss", label: formatValue(guessValue) };
  }
  if (!Number.isFinite(guessValue) || !Number.isFinite(targetValue)) {
    return { state: "miss", label: formatValue(guessValue) };
  }
  if (guessValue === targetValue) {
    return { state: "exact", label: formatValue(guessValue) };
  }
  const arrow = targetValue > guessValue ? "↑" : "↓";
  return { state: "direction", label: `${formatValue(guessValue)} ${arrow}` };
};

export const compareGuessPokemon = (
  guessPokemon: Pokemon,
  targetPokemon: Pokemon
): GuessFeedbackRow => {
  const isCorrect = guessPokemon.rawName === targetPokemon.rawName;
  const guessTypeSet = new Set(guessPokemon.typeNames || []);
  const targetTypeSet = new Set(targetPokemon.typeNames || []);
  const sharedTypes = Array.from(guessTypeSet).filter((type) =>
    targetTypeSet.has(type)
  );
  const exactTypeMatch =
    guessTypeSet.size === targetTypeSet.size &&
    Array.from(guessTypeSet).every((type) => targetTypeSet.has(type));

  return {
    rawName: guessPokemon.rawName,
    isCorrect,
    cells: {
      name: { state: isCorrect ? "exact" : "miss", label: guessPokemon.name },
      generation: formatGuessDirection(
        guessPokemon.generation ?? null,
        targetPokemon.generation ?? null,
        (value) => `Gen ${value ?? "?"}`
      ),
      type: {
        state: exactTypeMatch ? "exact" : sharedTypes.length ? "partial" : "miss",
        label: humanizeTypeList(guessPokemon.typeNames)
      },
      height: formatGuessDirection(
        guessPokemon.height ?? null,
        targetPokemon.height ?? null,
        (value) => `${formatMeters(value ?? NaN)} m`
      ),
      weight: formatGuessDirection(
        guessPokemon.weight ?? null,
        targetPokemon.weight ?? null,
        (value) => `${formatKilograms(value ?? NaN)} kg`
      ),
      bst: formatGuessDirection(
        guessPokemon.baseStatTotal ?? null,
        targetPokemon.baseStatTotal ?? null,
        (value) => String(value ?? "?")
      ),
      category: {
        state: guessPokemon.category === targetPokemon.category ? "exact" : "miss",
        label:
          CATEGORY_LABELS[guessPokemon.category] ||
          capitalize(guessPokemon.category || "standard")
      }
    }
  };
};

export const buildGuessCluePlan = (targetPokemon: Pokemon | null): GuessClue[] => {
  if (!targetPokemon) return [];

  const typeNames = Array.isArray(targetPokemon.typeNames)
    ? targetPokemon.typeNames
    : [];
  const randomType =
    typeNames[Math.floor(Math.random() * Math.max(typeNames.length, 1))] ||
    "unknown";

  const typeHints: GuessClue[] = [
    {
      id: "type-signal",
      label: "Type signal",
      value: `One of its types is ${capitalize(randomType)}`
    },
    {
      id: "type-profile",
      label: "Type profile",
      value: typeNames.length > 1 ? "This Pokemon is dual-type." : "This Pokemon is single-type."
    },
    {
      id: "type-family",
      label: "Type family",
      value: humanizeTypeList(typeNames)
    }
  ];
  const selectedTypeHint = typeHints[Math.floor(Math.random() * typeHints.length)];

  const habitatLabel =
    targetPokemon.habitat && targetPokemon.habitat !== "unknown"
      ? capitalize(targetPokemon.habitat)
      : `${capitalize(targetPokemon.speciesColor || "unknown")} color`;

  const categoryLabel =
    CATEGORY_LABELS[targetPokemon.category] ||
    capitalize(targetPokemon.category || "standard");

  const pool: GuessClue[] = [
    { id: "generation", label: "Generation", value: `Gen ${targetPokemon.generation || "?"}` },
    { id: "habitat", label: "Habitat / color", value: habitatLabel },
    { id: "category", label: "Category", value: categoryLabel },
    {
      id: "physical-profile",
      label: "Physical profile",
      value: `${formatMeters(targetPokemon.height)} m · ${formatKilograms(targetPokemon.weight)} kg`
    },
    { id: "height", label: "Height", value: `${formatMeters(targetPokemon.height)} m` },
    { id: "weight", label: "Weight", value: `${formatKilograms(targetPokemon.weight)} kg` },
    { id: "bst", label: "Base stat total", value: `${targetPokemon.baseStatTotal} BST` },
    { id: "name-start", label: "Name start", value: `Starts with ${targetPokemon.name.charAt(0)}` },
    {
      id: "name-shape",
      label: "Name shape",
      value: `${targetPokemon.nameLength} letters`
    },
    {
      id: "name-end",
      label: "Name ending",
      value: `Ends with ${targetPokemon.name.charAt(targetPokemon.name.length - 1)}`
    }
  ];

  return [selectedTypeHint, ...shuffle(pool).slice(0, 4)];
};
