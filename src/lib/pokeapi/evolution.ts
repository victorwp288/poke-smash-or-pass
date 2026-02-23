import { ITEM_SPRITE_CDN, SPRITE_CDN } from "@/lib/constants";
import { capitalize, normalizeInlineText } from "@/lib/text";
import type { EvolutionEntry, EvolutionStages } from "@/lib/pokeapi/types";

type EvolutionDetail = Record<string, any>;

type EvolutionChainNode = {
  species?: { name?: string; url?: string };
  evolution_details?: EvolutionDetail[];
  evolves_to?: EvolutionChainNode[];
};

const getGenerationFromId = (id: number | null) => {
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return null;
  if (id >= 1 && id <= 151) return 1;
  if (id >= 152 && id <= 251) return 2;
  if (id >= 252 && id <= 386) return 3;
  if (id >= 387 && id <= 493) return 4;
  if (id >= 494 && id <= 649) return 5;
  if (id >= 650 && id <= 721) return 6;
  if (id >= 722 && id <= 809) return 7;
  if (id >= 810 && id <= 905) return 8;
  if (id >= 906 && id <= 1025) return 9;
  return null;
};

const getSpeciesIdFromUrl = (url: string | undefined) => {
  if (!url) return null;
  const match = url.match(/\/pokemon-species\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
};

const getSpeciesSpriteUrl = (id: number | null) => {
  if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) return "";
  return `${SPRITE_CDN}/${id}.png`;
};

const getItemSpriteUrl = (itemName: string) => {
  if (!itemName) return "";
  return `${ITEM_SPRITE_CDN}/${itemName}.png`;
};

const getRelativePhysicalStatsLabel = (value: number) => {
  if (value === 1) return "Atk > Def";
  if (value === -1) return "Atk < Def";
  if (value === 0) return "Atk = Def";
  return "";
};

const EVOLUTION_FORM_METHOD_OVERRIDES: Record<
  string,
  Array<{ pattern: RegExp; suffix: string }>
> = {
  ninetales: [{ pattern: /\bIce Stone\b/i, suffix: "Alola" }],
  sandslash: [{ pattern: /\bIce Stone\b/i, suffix: "Alola" }],
  slowbro: [{ pattern: /\bGalarica Cuff\b/i, suffix: "Galar" }],
  slowking: [{ pattern: /\bGalarica Wreath\b/i, suffix: "Galar" }]
};

const getEvolutionFormSuffixForMethod = (
  speciesName: string,
  methodLabel: string
) => {
  if (!speciesName || !methodLabel) return "";
  const rules = EVOLUTION_FORM_METHOD_OVERRIDES[speciesName] || [];
  const matchedRule = rules.find((rule) => rule.pattern.test(methodLabel));
  return matchedRule?.suffix || "";
};

export const splitEvolutionEntryVariants = (
  entry: Pick<EvolutionEntry, "name" | "label" | "methodLabels">
) => {
  const labels = Array.isArray(entry.methodLabels) ? entry.methodLabels : [];
  const hasFormSpecificMethod = labels.some((methodLabel) =>
    Boolean(getEvolutionFormSuffixForMethod(entry.name, methodLabel))
  );
  if (!hasFormSpecificMethod || labels.length <= 1) {
    return [{ label: entry.label, methodLabels: labels }];
  }

  return labels.map((methodLabel) => {
    const suffix = getEvolutionFormSuffixForMethod(entry.name, methodLabel);
    const variantLabel = suffix ? `${entry.label} (${suffix})` : entry.label;
    return { label: variantLabel, methodLabels: [methodLabel] };
  });
};

const formatEvolutionDetail = (detail: EvolutionDetail) => {
  if (!detail || typeof detail !== "object") return "Special";
  const trigger = detail.trigger?.name || "";
  const parts: string[] = [];

  if (trigger === "use-item" && detail.item?.name) {
    parts.push(`Use ${capitalize(detail.item.name)}`);
  } else if (trigger === "trade") {
    if (detail.held_item?.name) {
      parts.push(`Trade holding ${capitalize(detail.held_item.name)}`);
    } else if (detail.trade_species?.name) {
      parts.push(`Trade for ${capitalize(detail.trade_species.name)}`);
    } else {
      parts.push("Trade");
    }
  } else if (trigger === "shed") {
    parts.push("Shed (Nincada)");
  } else if (trigger === "level-up") {
    if (detail.min_level) parts.push(`Level ${detail.min_level}`);
    else parts.push("Level up");
  } else {
    parts.push(trigger ? capitalize(trigger) : "Special");
  }

  if (detail.gender === 1) parts.push("Female");
  if (detail.gender === 2) parts.push("Male");
  if (detail.held_item?.name) parts.push(`Holding ${capitalize(detail.held_item.name)}`);
  if (detail.item?.name && trigger !== "use-item") parts.push(capitalize(detail.item.name));
  if (detail.known_move?.name) parts.push(`Know ${capitalize(detail.known_move.name)}`);
  if (detail.known_move_type?.name) parts.push(`${capitalize(detail.known_move_type.name)} move`);
  if (detail.location?.name) parts.push(`At ${capitalize(detail.location.name)}`);
  if (detail.party_species?.name) parts.push(`With ${capitalize(detail.party_species.name)}`);
  if (detail.party_type?.name) parts.push(`${capitalize(detail.party_type.name)} in party`);
  if (detail.needs_overworld_rain) parts.push("Rain");
  if (typeof detail.relative_physical_stats === "number") {
    const comparisonLabel = getRelativePhysicalStatsLabel(detail.relative_physical_stats);
    if (comparisonLabel) parts.push(comparisonLabel);
  }
  if (detail.turn_upside_down) parts.push("Upside down");

  const unique = Array.from(new Set(parts.filter(Boolean)));
  return unique.length ? unique.join(" · ") : "Special";
};

export const parseStoneMethodLabel = (methodLabel: string) => {
  if (typeof methodLabel !== "string") return null;
  const match = methodLabel.match(/^Use\s+(.+?\sStone)(?:\s·\s(.+))?$/i);
  if (!match) return null;
  const stoneLabel = match[1].replace(/\s+/g, " ").trim();
  const extraLabel = match[2] ? normalizeInlineText(match[2]) : "";
  const itemName = stoneLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!itemName) return null;
  return { label: stoneLabel, sprite: getItemSpriteUrl(itemName), extraLabel };
};

const getEvolutionMethodLabels = (details: EvolutionDetail[] | undefined) => {
  if (!Array.isArray(details) || details.length === 0) return [];
  const labels = details.map((detail) => formatEvolutionDetail(detail));
  return Array.from(new Set(labels.filter(Boolean)));
};

export const buildEvolutionStages = (root: EvolutionChainNode | undefined) => {
  if (!root) return [];
  const stageMaps: Array<Map<string, EvolutionEntry>> = [];

  const visitNode = (
    node: EvolutionChainNode,
    depth: number,
    parent: EvolutionEntry | null = null
  ) => {
    const speciesName = node?.species?.name;
    if (!speciesName) return;

    if (!stageMaps[depth]) stageMaps[depth] = new Map();

    const id = getSpeciesIdFromUrl(node.species?.url);
    const generation = getGenerationFromId(id);
    const parentGeneration = parent?.generation ?? null;
    const methodLabels = parent ? getEvolutionMethodLabels(node.evolution_details) : [];
    const isLaterGenEvolution =
      parentGeneration !== null &&
      generation !== null &&
      generation > parentGeneration;

    if (!stageMaps[depth].has(speciesName)) {
      stageMaps[depth].set(speciesName, {
        name: speciesName,
        label: capitalize(speciesName),
        id,
        sprite: getSpeciesSpriteUrl(id),
        generation,
        parentName: parent?.name || null,
        parentGeneration,
        isLaterGenEvolution,
        methodLabels
      });
    } else {
      const existing = stageMaps[depth].get(speciesName)!;
      existing.methodLabels = Array.from(
        new Set([...existing.methodLabels, ...methodLabels])
      );
      existing.isLaterGenEvolution =
        existing.isLaterGenEvolution || isLaterGenEvolution;
    }

    const current = stageMaps[depth].get(speciesName)!;
    const evolvesTo = Array.isArray(node.evolves_to) ? node.evolves_to : [];
    evolvesTo.forEach((next) => visitNode(next, depth + 1, current));
  };

  visitNode(root, 0);
  return stageMaps.filter(Boolean).map((stage) => Array.from(stage.values()));
};

export const normalizeEvolutionChain = (chainPayload: any): EvolutionStages => {
  try {
    const root = chainPayload?.chain as EvolutionChainNode | undefined;
    return buildEvolutionStages(root);
  } catch {
    return [];
  }
};
