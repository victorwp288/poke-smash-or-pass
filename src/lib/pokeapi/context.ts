import {
  DEFAULT_LOCALE,
  type AppLocale,
  getLocalizedEffectText,
  getLocalizedName
} from "@/lib/i18n/it";
import { getDefaultPokemonRequestKey } from "@/lib/pokeapi/api";
import { fetchJson } from "@/lib/pokeapi/client";
import type {
  PokemonFormOption,
  PokemonMoveSpotlight
} from "@/lib/pokeapi/types";
import { capitalize, normalizeInlineText } from "@/lib/text";
import type { PokemonTypeName } from "@/lib/typeChart";

const FORM_LABELS: Record<
  AppLocale,
  {
    default: string;
    regional: Record<string, string>;
    tokens: Record<string, string>;
  }
> = {
  en: {
    default: "Default",
    regional: {
      alola: "Alola",
      galar: "Galar",
      hisui: "Hisui",
      paldea: "Paldea"
    },
    tokens: {
      male: "Male",
      female: "Female",
      mega: "Mega",
      x: "X",
      y: "Y",
      attack: "Attack",
      defense: "Defense",
      speed: "Speed",
      origin: "Origin",
      altered: "Altered",
      thermian: "Therian",
      therian: "Therian",
      incarnate: "Incarnate",
      ordinary: "Ordinary",
      resolute: "Resolute",
      pirouette: "Pirouette",
      aria: "Aria",
      zen: "Zen",
      standard: "Standard",
      sky: "Sky",
      blade: "Blade",
      shield: "Shield",
      school: "School",
      busted: "Busted",
      disguise: "Disguise",
      dawn: "Dawn",
      dusk: "Dusk",
      midday: "Midday",
      midnight: "Midnight",
      blaze: "Blaze",
      aqua: "Aqua",
      combat: "Combat",
      breed: "Breed",
      white: "White",
      black: "Black",
      ice: "Ice",
      shadow: "Shadow",
      sunny: "Sunny",
      rainy: "Rainy",
      snowy: "Snowy",
      red: "Red",
      blue: "Blue",
      yellow: "Yellow",
      green: "Green"
    }
  },
  it: {
    default: "Base",
    regional: {
      alola: "Alola",
      galar: "Galar",
      hisui: "Hisui",
      paldea: "Paldea"
    },
    tokens: {
      male: "Maschio",
      female: "Femmina",
      mega: "Mega",
      x: "X",
      y: "Y",
      attack: "Attacco",
      defense: "Difesa",
      speed: "Velocita",
      origin: "Origine",
      altered: "Alterata",
      thermian: "Therian",
      therian: "Therian",
      incarnate: "Incarnata",
      ordinary: "Normale",
      resolute: "Risoluta",
      pirouette: "Piroetta",
      aria: "Aria",
      zen: "Zen",
      standard: "Standard",
      sky: "Cielo",
      blade: "Lama",
      shield: "Scudo",
      school: "Banco",
      busted: "Rotta",
      disguise: "Travestita",
      dawn: "Alba",
      dusk: "Crepuscolo",
      midday: "Mezzogiorno",
      midnight: "Mezzanotte",
      blaze: "Focoso",
      aqua: "Acquatico",
      combat: "Lotta",
      breed: "Razza",
      white: "Bianco",
      black: "Nero",
      ice: "Ghiaccio",
      shadow: "Ombra",
      sunny: "Sole",
      rainy: "Pioggia",
      snowy: "Neve",
      red: "Rosso",
      blue: "Blu",
      yellow: "Giallo",
      green: "Verde"
    }
  }
};

const MOVE_SPOTLIGHT_LIMIT = 4;
const MOVE_SHORTLIST_LIMIT = 18;

const formOptionsCache = new Map<string, PokemonFormOption[]>();
const moveDetailsCache = new Map<string, any>();
const moveSpotlightCache = new Map<string, PokemonMoveSpotlight[]>();

const REGIONAL_FORM_KEYS = new Set(["alola", "galar", "hisui", "paldea"]);
const BATTLE_FORM_KEYS = new Set([
  "attack",
  "defense",
  "speed",
  "origin",
  "altered",
  "therian",
  "thermian",
  "incarnate",
  "zen",
  "school",
  "blade",
  "shield",
  "pirouette",
  "aria",
  "busted",
  "disguise"
]);

const normalizeTypeNames = (types: any): PokemonTypeName[] =>
  (Array.isArray(types) ? types : [])
    .slice()
    .sort((a: any, b: any) => (a?.slot || 0) - (b?.slot || 0))
    .map((entry: any) => entry?.type?.name)
    .filter(Boolean);

const getThumb = (sprites: any) =>
  String(
    sprites?.front_default ||
      sprites?.other?.["official-artwork"]?.front_default ||
      sprites?.other?.home?.front_default ||
      sprites?.back_default ||
      ""
  );

const getLearnMethodWeight = (learnMethod: string) => {
  switch (learnMethod) {
    case "level-up":
      return 4;
    case "machine":
      return 3;
    case "tutor":
      return 2;
    case "egg":
      return 1;
    default:
      return 0;
  }
};

const getPreferredLearnMethod = (moveEntry: any) => {
  const details = Array.isArray(moveEntry?.version_group_details)
    ? moveEntry.version_group_details
    : [];

  return details.slice().sort((a: any, b: any) => {
    const methodDelta =
      getLearnMethodWeight(b?.move_learn_method?.name || "") -
      getLearnMethodWeight(a?.move_learn_method?.name || "");
    if (methodDelta !== 0) return methodDelta;
    return (
      (Number(b?.level_learned_at) || 0) - (Number(a?.level_learned_at) || 0)
    );
  })[0];
};

const getShortEffect = (move: any, locale: AppLocale) => {
  const effect = getLocalizedEffectText(
    Array.isArray(move?.effect_entries) ? move.effect_entries : [],
    locale
  );
  const chance = Number(move?.effect_chance);
  return normalizeInlineText(
    effect.replace(
      /\$effect_chance/g,
      Number.isFinite(chance) && chance > 0 ? String(chance) : ""
    )
  );
};

const getFormRank = (form: PokemonFormOption) => {
  if (form.isDefault) return 0;
  if (form.isRegional) return 1;
  if (form.isMega) return 2;
  if (form.isBattleOnly) return 3;
  return 4;
};

const getMoveScore = (move: PokemonMoveSpotlight) => {
  const power = Number(move.power) || (move.damageClass === "status" ? 18 : 0);
  const accuracy = Number(move.accuracy) || 100;
  const pp = Number(move.pp) || 0;
  const priority = Math.max(0, Number(move.priority) || 0);
  const learnBonus = getLearnMethodWeight(move.learnMethod) * 8;
  const levelBonus = (Number(move.levelLearnedAt) || 0) / 4;
  const stabBonus = move.isStab ? 10 : 0;
  const effectBonus = move.shortEffect ? 14 : 0;
  const utilityBonus = move.damageClass === "status" ? 20 : 0;

  return (
    power +
    accuracy / 8 +
    pp / 6 +
    priority * 18 +
    learnBonus +
    levelBonus +
    stabBonus +
    effectBonus +
    utilityBonus
  );
};

const compareMoveScore = (
  left: PokemonMoveSpotlight,
  right: PokemonMoveSpotlight
) => {
  const scoreDelta = getMoveScore(right) - getMoveScore(left);
  if (scoreDelta !== 0) return scoreDelta;
  const powerDelta = (Number(right.power) || 0) - (Number(left.power) || 0);
  if (powerDelta !== 0) return powerDelta;
  return left.label.localeCompare(right.label);
};

const takeNextMove = (
  candidates: PokemonMoveSpotlight[],
  selected: PokemonMoveSpotlight[]
) => {
  const selectedNames = new Set(selected.map((move) => move.name));
  return candidates.find((move) => !selectedNames.has(move.name)) || null;
};

const loadPokemonDetails = async (nameOrId: string | number) => {
  const key = String(nameOrId || "")
    .trim()
    .toLowerCase();
  if (!key) return null;

  try {
    return await fetchJson<any>(`pokemon/${key}`);
  } catch {
    const species = await fetchJson<any>(`pokemon-species/${key}`);
    const fallbackKey = getDefaultPokemonRequestKey(species, key);
    return fetchJson<any>(`pokemon/${fallbackKey}`);
  }
};

const loadMoveDetail = async (moveNameOrId: string | number) => {
  const key = String(moveNameOrId || "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  if (moveDetailsCache.has(key)) return moveDetailsCache.get(key);

  try {
    const detail = await fetchJson<any>(`move/${key}`);
    moveDetailsCache.set(key, detail);
    return detail;
  } catch {
    moveDetailsCache.set(key, null);
    return null;
  }
};

const getFormTokens = (requestKey: string, speciesName: string) => {
  const normalizedRequest = String(requestKey || "")
    .trim()
    .toLowerCase();
  const normalizedSpecies = String(speciesName || "")
    .trim()
    .toLowerCase();

  if (!normalizedRequest) return [];
  if (normalizedRequest === normalizedSpecies) return [];

  if (normalizedRequest.startsWith(`${normalizedSpecies}-`)) {
    return normalizedRequest
      .slice(normalizedSpecies.length + 1)
      .split("-")
      .filter(Boolean);
  }

  return normalizedRequest.split("-").filter(Boolean);
};

export const describePokemonForm = (
  requestKey: string,
  speciesName: string,
  locale: AppLocale = DEFAULT_LOCALE,
  isDefault = false
) => {
  const labels = FORM_LABELS[locale];
  const tokens = getFormTokens(requestKey, speciesName);
  const isMega = tokens.includes("mega");
  const isRegional = tokens.some((token) => REGIONAL_FORM_KEYS.has(token));
  const isBattleOnly = tokens.some((token) => BATTLE_FORM_KEYS.has(token));

  const label =
    tokens.length === 0
      ? labels.default
      : tokens
          .map((token) => {
            if (REGIONAL_FORM_KEYS.has(token)) {
              return labels.regional[token] || capitalize(token);
            }
            return labels.tokens[token] || capitalize(token);
          })
          .join(" ");

  return {
    label,
    shortLabel: label,
    isDefault,
    isMega,
    isRegional,
    isBattleOnly
  };
};

export const selectMoveSpotlight = (moves: PokemonMoveSpotlight[]) => {
  const ranked = [...moves].sort(compareMoveScore);
  const selected: PokemonMoveSpotlight[] = [];

  const stabDamaging = ranked.filter(
    (move) => move.isStab && move.damageClass !== "status"
  );
  const coverageDamaging = ranked.filter(
    (move) => !move.isStab && move.damageClass !== "status"
  );
  const utilityMoves = ranked.filter((move) => move.damageClass === "status");

  const stabPick = takeNextMove(stabDamaging, selected);
  if (stabPick) selected.push(stabPick);

  const coveragePick = takeNextMove(coverageDamaging, selected);
  if (coveragePick) selected.push(coveragePick);

  const utilityPick = takeNextMove(utilityMoves, selected);
  if (utilityPick) selected.push(utilityPick);

  const highlightPick = takeNextMove(ranked, selected);
  if (highlightPick) selected.push(highlightPick);

  return selected.slice(0, MOVE_SPOTLIGHT_LIMIT);
};

export const fetchPokemonForms = async (
  speciesName: string,
  locale: AppLocale = DEFAULT_LOCALE
): Promise<PokemonFormOption[]> => {
  const key = `${String(speciesName || "")
    .trim()
    .toLowerCase()}|${locale}`;
  if (!key || key.startsWith("|")) return [];
  if (formOptionsCache.has(key)) return formOptionsCache.get(key)!;

  try {
    const species = await fetchJson<any>(`pokemon-species/${speciesName}`);
    const normalizedSpecies = String(species?.name || speciesName)
      .trim()
      .toLowerCase();
    const varieties = Array.isArray(species?.varieties)
      ? species.varieties
      : [];

    const results = await Promise.allSettled(
      varieties.map(async (entry: any) => {
        const requestKey = String(entry?.pokemon?.name || "")
          .trim()
          .toLowerCase();
        if (!requestKey) return null;

        const details = await fetchJson<any>(`pokemon/${requestKey}`);
        const meta = describePokemonForm(
          requestKey,
          normalizedSpecies,
          locale,
          Boolean(entry?.is_default)
        );

        return {
          requestKey,
          label: meta.label,
          shortLabel: meta.shortLabel,
          thumb: getThumb(details?.sprites || {}),
          isDefault: meta.isDefault,
          isMega: meta.isMega,
          isRegional: meta.isRegional,
          isBattleOnly: meta.isBattleOnly,
          typeNames: normalizeTypeNames(details?.types || [])
        } satisfies PokemonFormOption;
      })
    );

    const forms = results
      .map((result) => (result.status === "fulfilled" ? result.value : null))
      .filter(Boolean) as PokemonFormOption[];

    forms.sort((left, right) => {
      const rankDelta = getFormRank(left) - getFormRank(right);
      if (rankDelta !== 0) return rankDelta;
      return left.label.localeCompare(right.label);
    });

    formOptionsCache.set(key, forms);
    return forms;
  } catch {
    formOptionsCache.set(key, []);
    return [];
  }
};

export const fetchPokemonMoveSpotlight = async (
  nameOrId: string | number,
  locale: AppLocale = DEFAULT_LOCALE
): Promise<PokemonMoveSpotlight[]> => {
  const key = `${String(nameOrId || "")
    .trim()
    .toLowerCase()}|${locale}`;
  if (!key || key.startsWith("|")) return [];
  if (moveSpotlightCache.has(key)) return moveSpotlightCache.get(key)!;

  try {
    const details = await loadPokemonDetails(nameOrId);
    const typeSet = new Set(normalizeTypeNames(details?.types || []));

    const shortlistMap = new Map<
      string,
      {
        name: string;
        learnMethod: string;
        levelLearnedAt: number | null;
        score: number;
      }
    >();

    (Array.isArray(details?.moves) ? details.moves : []).forEach(
      (entry: any) => {
        const name = String(entry?.move?.name || "")
          .trim()
          .toLowerCase();
        if (!name) return;

        const learnDetail = getPreferredLearnMethod(entry);
        const learnMethod = String(
          learnDetail?.move_learn_method?.name || ""
        ).trim();
        const levelLearnedAt = Number(learnDetail?.level_learned_at) || 0;
        const score = getLearnMethodWeight(learnMethod) * 100 + levelLearnedAt;
        const existing = shortlistMap.get(name);

        if (!existing || score > existing.score) {
          shortlistMap.set(name, {
            name,
            learnMethod,
            levelLearnedAt: levelLearnedAt || null,
            score
          });
        }
      }
    );

    const shortlist = Array.from(shortlistMap.values())
      .sort((left, right) => {
        const scoreDelta = right.score - left.score;
        if (scoreDelta !== 0) return scoreDelta;
        return left.name.localeCompare(right.name);
      })
      .slice(0, MOVE_SHORTLIST_LIMIT);

    const spotlightCandidates = (
      await Promise.all(
        shortlist.map(async (entry) => {
          const move = await loadMoveDetail(entry.name);
          const typeName = String(
            move?.type?.name || ""
          ).trim() as PokemonTypeName;
          if (!move || !typeName) return null;

          return {
            name: entry.name,
            label: getLocalizedName(
              Array.isArray(move?.names) ? move.names : [],
              locale,
              capitalize(entry.name)
            ),
            type: typeName,
            damageClass: String(move?.damage_class?.name || "status"),
            power: Number.isFinite(Number(move?.power))
              ? Number(move.power)
              : null,
            accuracy: Number.isFinite(Number(move?.accuracy))
              ? Number(move.accuracy)
              : null,
            pp: Number.isFinite(Number(move?.pp)) ? Number(move.pp) : null,
            priority: Number(move?.priority) || 0,
            shortEffect: getShortEffect(move, locale),
            learnMethod: entry.learnMethod,
            levelLearnedAt: entry.levelLearnedAt,
            isStab: typeSet.has(typeName)
          } satisfies PokemonMoveSpotlight;
        })
      )
    ).filter(Boolean) as PokemonMoveSpotlight[];

    const spotlight = selectMoveSpotlight(spotlightCandidates);
    moveSpotlightCache.set(key, spotlight);
    return spotlight;
  } catch {
    moveSpotlightCache.set(key, []);
    return [];
  }
};
