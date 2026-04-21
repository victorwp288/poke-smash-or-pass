import { useShell } from "@/app/providers/ShellProvider";
import { useLocale } from "@/app/providers/LocaleProvider";
import { ThemeModeToggle } from "@/components/shell/ThemeModeToggle";
import { ActionRow } from "@/games/smash/components/ActionRow";
import { FiltersPanel } from "@/games/smash/components/FiltersPanel";
import { PokemonCard } from "@/games/smash/components/PokemonCard";
import { PokemonPickerModal } from "@/games/smash/components/PokemonPickerModal";
import {
  SummaryModal,
  type SmashSummary
} from "@/games/smash/components/SummaryModal";
import {
  FAVORITES_KEY,
  FILTER_KEY,
  MODE_KEY,
  OPTIONS_KEY,
  STORAGE_KEY,
  defaultFilters,
  defaultHistory,
  defaultOptions,
  getHistoryEntryKey,
  parseFavorites,
  parseFilters,
  parseHistory,
  parseOptions
} from "@/games/smash/smashStorage";
import type {
  HistoryEntry,
  SmashHistoryStorage,
  SmashOptionsStorage,
  SwipeDirection
} from "@/games/smash/smashTypes";
import { useSmashDeck } from "@/games/smash/useSmashDeck";
import { useSwipeCard } from "@/games/smash/useSwipeCard";
import { downloadDataUrl, downloadFile } from "@/lib/files";
import {
  getStatLabel,
  getTypeLabel,
  type AppLocale,
  type LocaleStrings
} from "@/lib/i18n/it";
import {
  GENERATION_ROSTER_ENTRIES_STALE_MS,
  prefetchGenerationRosterEntries
} from "@/lib/pokeapi/hooks";
import type { Pokemon } from "@/lib/pokeapi/types";
import { useLocalStorageState } from "@/lib/storage";
import { TYPE_LIST, type PokemonTypeName } from "@/lib/typeChart";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import {
  Box,
  Button,
  Chip,
  ClickAwayListener,
  Paper,
  Stack,
  Typography,
  alpha,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import React from "react";

const SUMMARY_INTERVAL = 20;
const SWIPE_ANIMATION_MS = 320;
const SHUFFLE_ANIMATION_MS = 520;
const GEN_TOTAL = 9;

type SwipeRecord = {
  pokemon: Pokemon;
  direction: SwipeDirection;
};

const applySmashStats = (
  pokemon: Pokemon,
  delta: number,
  typeCounts: Record<string, number>,
  statTotals: Record<string, number>
) => {
  const nextTypeCounts = { ...typeCounts };
  const nextStatTotals = { ...statTotals };

  pokemon.types.forEach((type) => {
    const name = type.type.name;
    const current = Number(nextTypeCounts[name] ?? 0) || 0;
    const next = current + delta;
    if (next <= 0) delete nextTypeCounts[name];
    else nextTypeCounts[name] = next;
  });

  pokemon.stats.forEach((stat) => {
    const key = stat.stat.name;
    const current = Number(nextStatTotals[key] ?? 0) || 0;
    const next = current + stat.base_stat * delta;
    nextStatTotals[key] = Math.max(0, next);
  });

  return { typeCounts: nextTypeCounts, statTotals: nextStatTotals };
};

const recomputeStreaks = (stack: SwipeRecord[]) => {
  let smashStreak = 0;
  let passStreak = 0;
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const direction = stack[i].direction;
    if (direction === "smash") {
      if (passStreak > 0) break;
      smashStreak += 1;
    } else {
      if (smashStreak > 0) break;
      passStreak += 1;
    }
  }
  return { smashStreak, passStreak };
};

const buildBadges = ({
  smashStreak,
  passStreak,
  smashCount,
  typeCounts,
  statTotals,
  locale,
  strings
}: {
  smashStreak: number;
  passStreak: number;
  smashCount: number;
  typeCounts: Record<string, number>;
  statTotals: Record<string, number>;
  locale: AppLocale;
  strings: LocaleStrings;
}) => {
  const badges: string[] = [];
  if (smashStreak >= 5) badges.push(strings.badges.hotStreak);
  if (passStreak >= 5) badges.push(strings.badges.coldStreak);

  const typeEntries = Object.entries(typeCounts)
    .map(([type, count]) => [type, Number(count) || 0] as const)
    .sort((a, b) => b[1] - a[1]);
  if (typeEntries[0]?.[1] >= 6) {
    badges.push(
      strings.badges.typeFan(getTypeLabel(locale, typeEntries[0][0]))
    );
  }

  if (smashCount > 0) {
    const totals = statTotals;
    const avgSpeed = Math.round((Number(totals.speed) || 0) / smashCount);
    const avgAtk = Math.round((Number(totals.attack) || 0) / smashCount);
    const avgSpAtk = Math.round(
      (Number(totals["special-attack"]) || 0) / smashCount
    );
    const avgDef = Math.round((Number(totals.defense) || 0) / smashCount);
    const avgSpDef = Math.round(
      (Number(totals["special-defense"]) || 0) / smashCount
    );

    if (avgSpeed >= 90) badges.push(strings.badges.speedDemon);
    if (avgAtk + avgSpAtk >= 160 && avgDef + avgSpDef < 120) {
      badges.push(strings.badges.glassCannon);
    }
    if (avgDef + avgSpDef >= 160) badges.push(strings.badges.tankMode);
  }

  return Array.from(new Set(badges)).slice(0, 5);
};

const buildSummary = (
  history: SmashHistoryStorage,
  locale: AppLocale
): SmashSummary => {
  const totalSwipes = history.smashCount + history.passCount;
  const smashRate = totalSwipes
    ? Math.round((history.smashCount / totalSwipes) * 100)
    : 0;

  const typeEntries = Object.entries(history.typeCounts ?? {})
    .map(([type, count]) => [type, Number(count) || 0] as const)
    .sort((a, b) => b[1] - a[1]);
  const topTypes = typeEntries
    .filter(([, count]) => count > 0)
    .slice(0, 3)
    .map(([type, count]) => ({ type: getTypeLabel(locale, type), count }));

  const totals = history.statTotals ?? {};
  const avgStats = [
    "attack",
    "defense",
    "special-attack",
    "special-defense",
    "speed"
  ].map((key) => ({
    label: getStatLabel(locale, key),
    value: history.smashCount
      ? Math.round((Number((totals as any)[key]) || 0) / history.smashCount)
      : 0
  }));

  return { totalSwipes, smashRate, topTypes, avgStats };
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  if ((ctx as any).roundRect) {
    ctx.beginPath();
    (ctx as any).roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const buildSmashHelpBody = (smashPassMode: boolean, strings: LocaleStrings) => (
  <Stack spacing={1.2}>
    {[
      [
        strings.page.helpRows.swipe,
        smashPassMode
          ? strings.page.helpValues.swipeEnabled
          : strings.page.helpValues.swipeDisabled
      ],
      [
        strings.page.helpRows.keys,
        smashPassMode
          ? strings.page.helpValues.keysEnabled
          : strings.page.helpValues.keysDisabled
      ],
      [strings.page.helpRows.undo, strings.page.helpValues.undo],
      [
        strings.page.helpRows.shuffle,
        smashPassMode
          ? strings.page.helpValues.shuffleEnabled
          : strings.page.helpValues.shuffleDisabled
      ],
      [strings.page.helpRows.peek, strings.page.helpValues.peek]
    ].map(([label, value]) => (
      <Stack
        key={label}
        direction="row"
        justifyContent="space-between"
        spacing={2}
        alignItems="center"
      >
        <Typography variant="body2" fontWeight={700}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {value}
        </Typography>
      </Stack>
    ))}
  </Stack>
);

const CornerPokeballMenu = ({
  undoCount,
  undoDisabled,
  onUndo,
  onOpenFilters
}: {
  undoCount: number;
  undoDisabled: boolean;
  onUndo: () => void;
  onOpenFilters: () => void;
}) => {
  const { strings } = useLocale();
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const ballStroke =
    theme.palette.mode === "dark"
      ? alpha(theme.palette.common.white, 0.84)
      : "#141414";
  const ballBottom =
    theme.palette.mode === "dark" ? theme.palette.background.paper : "#f6f1e8";

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box
        sx={{
          position: "fixed",
          top: "max(env(safe-area-inset-top), 12px)",
          left: "max(env(safe-area-inset-left), 12px)",
          zIndex: 999
        }}
      >
        <Box sx={{ position: "relative" }}>
          {open ? (
            <Paper
              id="smash-corner-menu"
              variant="outlined"
              sx={{
                position: "absolute",
                top: "calc(100% + 10px)",
                left: 0,
                minWidth: 120,
                p: 1,
                borderRadius: 0,
                bgcolor: "background.paper",
                borderColor: "divider",
                boxShadow: "0 16px 32px rgba(16, 24, 40, 0.18)"
              }}
            >
              <Stack spacing={0.75}>
                <Button
                  variant="outlined"
                  startIcon={<UndoRoundedIcon />}
                  disabled={undoDisabled}
                  onClick={() => {
                    onUndo();
                    setOpen(false);
                  }}
                  sx={{ justifyContent: "flex-start" }}
                >
                  {strings.page.undo(undoCount)}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<FilterAltRoundedIcon />}
                  onClick={() => {
                    onOpenFilters();
                    setOpen(false);
                  }}
                  sx={{ justifyContent: "flex-start" }}
                >
                  {strings.filters.button}
                </Button>
                <ThemeModeToggle fullWidth justifyContent="flex-start" />
              </Stack>
            </Paper>
          ) : null}

          <Box
            component="button"
            type="button"
            aria-label={strings.page.openDeckTools}
            aria-expanded={open}
            aria-controls="smash-corner-menu"
            onClick={() => setOpen((prev) => !prev)}
            sx={{
              width: { xs: 40, sm: 60 },
              height: { xs: 40, sm: 60 },
              borderRadius: "50%",
              border: "3px solid",
              borderColor: ballStroke,
              padding: 0,
              cursor: "pointer",
              position: "relative",
              display: "block",
              background: `linear-gradient(180deg, #e64b3b 0 46%, ${ballStroke} 46% 56%, ${ballBottom} 56% 100%)`,
              boxShadow:
                theme.palette.mode === "dark"
                  ? "0 14px 28px rgba(0, 0, 0, 0.34), inset 0 2px 0 rgba(255,255,255,0.16)"
                  : "0 14px 28px rgba(16, 24, 40, 0.24), inset 0 2px 0 rgba(255,255,255,0.4)",
              transition: "transform 160ms ease, box-shadow 160ms ease",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: "50% auto auto 50%",
                width: 18,
                height: 18,
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                border: "3px solid",
                borderColor: ballStroke,
                bgcolor: ballBottom,
                boxShadow:
                  theme.palette.mode === "dark"
                    ? "0 0 0 4px rgba(255,255,255,0.14)"
                    : "0 0 0 4px rgba(255,255,255,0.35)"
              },
              "&::after": {
                content: '""',
                position: "absolute",
                left: "50%",
                top: "50%",
                width: "100%",
                height: 6,
                transform: "translate(-50%, -50%)",
                bgcolor: ballStroke
              },
              "&:hover": {
                transform: "translateY(-1px) scale(1.02)",
                boxShadow:
                  theme.palette.mode === "dark"
                    ? "0 18px 36px rgba(0, 0, 0, 0.42), inset 0 2px 0 rgba(255,255,255,0.18)"
                    : "0 18px 36px rgba(16, 24, 40, 0.28), inset 0 2px 0 rgba(255,255,255,0.42)"
              }
            }}
          />
        </Box>
      </Box>
    </ClickAwayListener>
  );
};

const SessionPanel = ({
  statusText,
  queueLeft,
  smashCount,
  passCount,
  smashStreak,
  passStreak,
  favoritesCount,
  badges,
  recentSmash,
  recentPass
}: {
  statusText: string;
  queueLeft: number;
  smashCount: number;
  passCount: number;
  smashStreak: number;
  passStreak: number;
  favoritesCount: number;
  badges: string[];
  recentSmash: HistoryEntry[];
  recentPass: HistoryEntry[];
}) => {
  const { strings } = useLocale();
  const statCards = [
    {
      label: strings.session.deckLeft,
      value: queueLeft,
      icon: <TravelExploreRoundedIcon fontSize="small" />
    },
    {
      label: strings.session.smash,
      value: smashCount,
      icon: <FavoriteRoundedIcon fontSize="small" />
    },
    {
      label: strings.session.pass,
      value: passCount,
      icon: <HistoryRoundedIcon fontSize="small" />
    },
    {
      label: strings.session.saved,
      value: favoritesCount,
      icon: <AutoAwesomeRoundedIcon fontSize="small" />
    }
  ];

  return (
    <Stack spacing={2}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 0,
          bgcolor: "background.paper",
          borderColor: "divider"
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <div>
              <Typography variant="overline" color="text.secondary">
                {strings.session.overline}
              </Typography>
              <Typography variant="h3">{strings.session.title}</Typography>
            </div>
          </Stack>

          <Typography variant="body2" color="text.secondary">
            {statusText}
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 1
            }}
          >
            {statCards.map((item) => (
              <Paper
                key={item.label}
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: 0,
                  bgcolor: "background.default"
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ color: "secondary.main" }}>{item.icon}</Box>
                  <div>
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="body1" fontWeight={700}>
                      {item.value}
                    </Typography>
                  </div>
                </Stack>
              </Paper>
            ))}
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {smashStreak > 0 ? (
              <Chip
                color="success"
                label={strings.session.smashStreak(smashStreak)}
              />
            ) : null}
            {passStreak > 0 ? (
              <Chip
                color="error"
                label={strings.session.passStreak(passStreak)}
              />
            ) : null}
            {!smashStreak && !passStreak ? (
              <Chip
                variant="outlined"
                label={strings.session.noCurrentStreak}
              />
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 0 }}>
        <Stack spacing={1.25}>
          <Typography variant="h3">{strings.session.badgeTitle}</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {badges.length ? (
              badges.map((badge) => (
                <Chip key={badge} color="primary" label={badge} />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                {strings.session.badgeEmpty}
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 0 }}>
        <Stack spacing={1.25}>
          <Typography variant="h3">{strings.session.deckRhythm}</Typography>
          <Typography variant="body2" color="text.secondary">
            {strings.session.deckRhythmBody}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip color="secondary" label={strings.session.saveFavorites} />
            <Chip variant="outlined" label={strings.session.filterByGen} />
            <Chip variant="outlined" label={strings.session.reshuffle} />
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 0 }}>
        <Stack spacing={1.25}>
          <Typography variant="h3">{strings.session.recentPicks}</Typography>
          <Typography variant="subtitle2">
            {strings.session.smashList}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {recentSmash.length ? (
              recentSmash.map((entry, idx) => (
                <Chip
                  key={`${getHistoryEntryKey(entry)}-${idx}`}
                  avatar={
                    <Box
                      component="img"
                      src={entry.thumb}
                      alt=""
                      sx={{ width: 24, height: 24 }}
                    />
                  }
                  label={entry.name}
                  variant="outlined"
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                {strings.filters.recentSmashEmpty}
              </Typography>
            )}
          </Stack>
          <Typography variant="subtitle2">
            {strings.session.passList}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {recentPass.length ? (
              recentPass.map((entry, idx) => (
                <Chip
                  key={`${getHistoryEntryKey(entry)}-${idx}`}
                  avatar={
                    <Box
                      component="img"
                      src={entry.thumb}
                      alt=""
                      sx={{ width: 24, height: 24 }}
                    />
                  }
                  label={entry.name}
                  variant="outlined"
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                {strings.filters.recentPassEmpty}
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
};

export const SmashPage = () => {
  const shell = useShell();
  const { locale, strings } = useLocale();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const queryClient = useQueryClient();
  const pickerPrefetchedRef = React.useRef(false);

  const initialFilters = React.useMemo(() => defaultFilters(), []);
  const initialOptions = React.useMemo(() => defaultOptions(), []);
  const initialHistory = React.useMemo(() => defaultHistory(), []);
  const initialFavorites = React.useMemo(() => [] as HistoryEntry[], []);

  const [filters, setFilters] = useLocalStorageState(
    FILTER_KEY,
    initialFilters,
    {
      parse: parseFilters
    }
  );
  const [options, setOptions] = useLocalStorageState(
    OPTIONS_KEY,
    initialOptions,
    {
      parse: parseOptions
    }
  );
  const [history, setHistory] = useLocalStorageState(
    STORAGE_KEY,
    initialHistory,
    {
      parse: parseHistory
    }
  );
  const [favorites, setFavorites] = useLocalStorageState(
    FAVORITES_KEY,
    initialFavorites,
    { parse: parseFavorites }
  );

  const deck = useSmashDeck({ filters, options });

  const [showStats, setShowStats] = React.useState(options.autoReveal);
  const [forcedSwipeStatus, setForcedSwipeStatus] = React.useState<
    "" | SwipeDirection
  >("");
  const [isAnimatingSwipe, setIsAnimatingSwipe] = React.useState(false);
  const [isShuffling, setIsShuffling] = React.useState(false);

  const [gallery, setGallery] = React.useState<string[]>([]);
  const [currentImage, setCurrentImage] = React.useState<string | null>(null);

  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [summaryData, setSummaryData] = React.useState<SmashSummary | null>(
    null
  );

  const [panelOpen, setPanelOpen] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const [swipeStack, setSwipeStack] = React.useState<SwipeRecord[]>([]);
  const [smashStreak, setSmashStreak] = React.useState(0);
  const [passStreak, setPassStreak] = React.useState(0);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [cryPlaying, setCryPlaying] = React.useState(false);

  const stopCryPlayback = React.useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
    }
    setCryPlaying(false);
  }, []);

  React.useEffect(() => {
    stopCryPlayback();
  }, [deck.currentPokemon?.rawName, stopCryPlayback]);

  React.useEffect(() => {
    return () => stopCryPlayback();
  }, [stopCryPlayback]);

  const playCry = React.useCallback(async () => {
    const url = deck.currentPokemon?.cry || "";
    if (!url) return;

    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";
      audioRef.current = audio;
    }

    stopCryPlayback();
    audio = audioRef.current!;
    audio.crossOrigin = "anonymous";
    audio.src = url;
    audio.currentTime = 0;

    const cleanup = () => {
      setCryPlaying(false);
    };

    audio.onended = cleanup;
    audio.onerror = cleanup;

    try {
      audio.load();
      setCryPlaying(true);
      await audio.play();
    } catch {
      cleanup();
    }
  }, [deck.currentPokemon?.cry, stopCryPlayback]);

  React.useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, "smash");
    } catch {
      // ignore
    }
    shell.setHeader({
      title: strings.shell.title,
      category: strings.shell.category
    });
  }, [shell, strings.shell.category, strings.shell.title]);

  React.useEffect(() => {
    shell.setHelp({
      title: strings.shell.helpTitle,
      body: buildSmashHelpBody(options.smashPassMode, strings)
    });
  }, [options.smashPassMode, shell, strings]);

  const badges = React.useMemo(
    () =>
      buildBadges({
        smashStreak,
        passStreak,
        smashCount: history.smashCount,
        typeCounts: (history.typeCounts ?? {}) as Record<string, number>,
        statTotals: (history.statTotals ?? {}) as Record<string, number>,
        locale,
        strings
      }),
    [
      history.smashCount,
      history.statTotals,
      history.typeCounts,
      locale,
      passStreak,
      smashStreak,
      strings
    ]
  );

  React.useEffect(() => {
    shell.setStatus(deck.statusText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.statusText]);

  React.useEffect(() => {
    shell.setScoreboard(
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          color="success"
          label={`${strings.session.smash} ${history.smashCount}`}
        />
        <Chip
          variant="outlined"
          color="error"
          label={`${strings.session.pass} ${history.passCount}`}
        />
      </Stack>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    history.passCount,
    history.smashCount,
    strings.session.pass,
    strings.session.smash
  ]);

  React.useEffect(() => {
    void deck.rebuildQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.rebuildQueue]);

  React.useEffect(() => {
    const pokemon = deck.currentPokemon;
    if (!pokemon) {
      setGallery([]);
      setCurrentImage(null);
      return;
    }

    const baseImage = options.shinyMode
      ? pokemon.images.shiny
      : pokemon.images.main;
    const nextGallery = pokemon.images.gallery.includes(baseImage)
      ? pokemon.images.gallery
      : [baseImage, ...pokemon.images.gallery];

    setGallery(nextGallery);
    setCurrentImage(baseImage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.currentPokemon?.rawName, options.shinyMode]);

  React.useEffect(() => {
    setShowStats(options.autoReveal);
  }, [deck.currentPokemon?.rawName, options.autoReveal]);

  const currentPokemonKey = deck.currentPokemon?.rawName
    ? getHistoryEntryKey({
        key: deck.currentPokemon.rawName,
        name: deck.currentPokemon.name
      })
    : "";

  const isFavorite = Boolean(
    deck.currentPokemon &&
    favorites.some((fav) => getHistoryEntryKey(fav) === currentPokemonKey)
  );

  const toggleFavorite = () => {
    const pokemon = deck.currentPokemon;
    if (!pokemon) return;
    const pokemonKey = getHistoryEntryKey({
      key: pokemon.rawName,
      name: pokemon.name
    });
    setFavorites((prev) => {
      const existingIndex = prev.findIndex(
        (fav) => getHistoryEntryKey(fav) === pokemonKey
      );
      if (existingIndex >= 0) {
        const next = [...prev];
        next.splice(existingIndex, 1);
        return next;
      }
      const entry: HistoryEntry = {
        key: pokemon.rawName,
        name: pokemon.name,
        thumb: pokemon.thumb || pokemon.images.main
      };
      return [entry, ...prev];
    });
  };

  const exportFavoritesJson = () => {
    if (!favorites.length) return;
    downloadFile(
      "smashdex-favorites.json",
      JSON.stringify(favorites, null, 2),
      "application/json"
    );
  };

  const exportFavoritesCsv = () => {
    if (!favorites.length) return;
    const header = "name";
    const rows = favorites.map((fav) => `"${fav.name.replace(/"/g, '""')}"`);
    downloadFile(
      "smashdex-favorites.csv",
      [header, ...rows].join("\n"),
      "text/csv"
    );
  };

  const shareMatchCard = async () => {
    const items = (favorites.length ? favorites : history.smash).slice(0, 8);
    if (!items.length) return;

    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 520;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    );
    gradient.addColorStop(0, "#ffe9c7");
    gradient.addColorStop(1, "#c4f3e8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#14130f";
    ctx.font = "36px Bungee, sans-serif";
    ctx.fillText(strings.page.shareTitle, 40, 70);
    ctx.font = "18px IBM Plex Sans, sans-serif";
    ctx.fillText(
      `${strings.session.smash} ${history.smashCount} / ${strings.session.pass} ${history.passCount}`,
      40,
      105
    );

    const startX = 40;
    const startY = 150;
    const gap = 110;
    const rowGap = 150;

    const images = await Promise.all(
      items.map((item) => loadImage(item.thumb))
    );

    items.forEach((item, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = startX + col * gap;
      const y = startY + row * rowGap;

      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.strokeStyle = "#14130f";
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, x, y, 96, 96, 18);
      ctx.fill();
      ctx.stroke();

      const img = images[index];
      if (img) {
        ctx.drawImage(img, x + 16, y + 10, 64, 64);
      }
      ctx.fillStyle = "#14130f";
      ctx.font = "12px IBM Plex Sans, sans-serif";
      ctx.fillText(item.name.toUpperCase(), x + 6, y + 90);
    });

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );

    if (blob) {
      const file = new File([blob], "smashdex-card.png", { type: blob.type });
      const canShareFiles =
        typeof navigator !== "undefined" &&
        "canShare" in navigator &&
        (navigator as any).canShare?.({ files: [file] });
      if (canShareFiles && "share" in navigator) {
        try {
          await (navigator as any).share({
            files: [file],
            title: strings.page.shareTitle
          });
          return;
        } catch {
          // fallback to download
        }
      }
    }

    downloadDataUrl("smashdex-card.png", canvas.toDataURL("image/png"));
  };

  const recordSwipe = (direction: SwipeDirection) => {
    const pokemon = deck.currentPokemon;
    if (!pokemon) return;

    const entry: HistoryEntry = {
      key: pokemon.rawName,
      name: pokemon.name,
      thumb: pokemon.thumb || pokemon.images.main
    };

    const previous = history;
    const next: SmashHistoryStorage = {
      smash: [...previous.smash],
      pass: [...previous.pass],
      smashCount: Number(previous.smashCount) || previous.smash.length,
      passCount: Number(previous.passCount) || previous.pass.length,
      typeCounts: { ...(previous.typeCounts ?? {}) },
      statTotals: { ...(previous.statTotals ?? {}) }
    };

    if (direction === "smash") {
      next.smashCount += 1;
      next.smash.push(entry);
      const applied = applySmashStats(
        pokemon,
        1,
        next.typeCounts as Record<string, number>,
        next.statTotals as Record<string, number>
      );
      next.typeCounts = applied.typeCounts;
      next.statTotals = applied.statTotals;
    } else {
      next.passCount += 1;
      next.pass.push(entry);
    }

    setHistory(next);
    setSwipeStack((prev) => [...prev, { pokemon, direction }]);
    if (direction === "smash") {
      setSmashStreak((prev) => prev + 1);
      setPassStreak(0);
    } else {
      setPassStreak((prev) => prev + 1);
      setSmashStreak(0);
    }

    const totalSwipes = next.smashCount + next.passCount;
    if (totalSwipes && totalSwipes % SUMMARY_INTERVAL === 0) {
      setSummaryData(buildSummary(next, locale));
      setSummaryOpen(true);
    }
  };

  const swipe = (direction: SwipeDirection) => {
    if (!deck.currentPokemon) return;
    if (!options.smashPassMode) return;
    if (isAnimatingSwipe || isShuffling) return;
    stopCryPlayback();
    setForcedSwipeStatus(direction);
    setIsAnimatingSwipe(true);
    recordSwipe(direction);
    window.setTimeout(() => {
      setForcedSwipeStatus("");
      setIsAnimatingSwipe(false);
      void deck.loadNext();
    }, SWIPE_ANIMATION_MS);
  };

  const undoLast = () => {
    if (!swipeStack.length) return;
    const last = swipeStack[swipeStack.length - 1];

    if (
      deck.currentPokemon?.rawName &&
      last.pokemon.rawName !== deck.currentPokemon.rawName
    ) {
      deck.prependToQueue(deck.currentPokemon.rawName);
    }

    const previous = history;
    const next: SmashHistoryStorage = {
      smash: [...previous.smash],
      pass: [...previous.pass],
      smashCount: Number(previous.smashCount) || previous.smash.length,
      passCount: Number(previous.passCount) || previous.pass.length,
      typeCounts: { ...(previous.typeCounts ?? {}) },
      statTotals: { ...(previous.statTotals ?? {}) }
    };

    if (last.direction === "smash") {
      next.smashCount = Math.max(0, next.smashCount - 1);
      next.smash.pop();
      const applied = applySmashStats(
        last.pokemon,
        -1,
        next.typeCounts as Record<string, number>,
        next.statTotals as Record<string, number>
      );
      next.typeCounts = applied.typeCounts;
      next.statTotals = applied.statTotals;
    } else {
      next.passCount = Math.max(0, next.passCount - 1);
      next.pass.pop();
    }

    const rest = swipeStack.slice(0, -1);
    setSwipeStack(rest);
    const streaks = recomputeStreaks(rest);
    setSmashStreak(streaks.smashStreak);
    setPassStreak(streaks.passStreak);

    setHistory(next);
    deck.setCurrentPokemon(last.pokemon);
  };

  const clearHistory = () => {
    setHistory({
      smash: [],
      pass: [],
      smashCount: 0,
      passCount: 0,
      typeCounts: {},
      statTotals: {}
    });
    setSwipeStack([]);
    setSmashStreak(0);
    setPassStreak(0);
  };

  const shuffleDeck = async () => {
    if (isShuffling) return;
    stopCryPlayback();
    setIsShuffling(true);
    setPanelOpen(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, SHUFFLE_ANIMATION_MS));
      await deck.rebuildQueue();
    } finally {
      setIsShuffling(false);
    }
  };

  const swipeApi = useSwipeCard({
    disabled:
      isAnimatingSwipe ||
      isShuffling ||
      !deck.currentPokemon ||
      !options.smashPassMode,
    isShuffling,
    onSwipe: swipe,
    onShuffle: shuffleDeck,
    shouldIgnoreEvent: (target) =>
      target instanceof Element &&
      Boolean(
        target.closest("button, input, label, [data-card-swipe-ignore='true']")
      )
  });

  const swipeStatus = forcedSwipeStatus || swipeApi.status;

  const handleCycleImage = (direction: "prev" | "next") => {
    if (!gallery.length) return;
    const current = currentImage ?? gallery[0];
    const idx = gallery.indexOf(current);
    if (idx === -1) {
      setCurrentImage(gallery[0]);
      return;
    }
    const nextIndex =
      direction === "prev"
        ? (idx - 1 + gallery.length) % gallery.length
        : (idx + 1) % gallery.length;
    setCurrentImage(gallery[nextIndex]);
  };

  const isDeckEmpty =
    !deck.currentPokemon && deck.statusText === strings.deck.empty;

  const handleSelectPokemon = React.useCallback(
    async (name: string) => {
      stopCryPlayback();
      try {
        await deck.jumpToPokemon(name);
        setPickerOpen(false);
      } catch {
        // Keep the picker open so the user can try another choice.
      }
    },
    [deck, stopCryPlayback]
  );

  const warmPokemonPicker = React.useCallback(() => {
    void Promise.all(
      Array.from({ length: GEN_TOTAL }, (_, index) =>
        prefetchGenerationRosterEntries(
          queryClient,
          index + 1,
          GENERATION_ROSTER_ENTRIES_STALE_MS
        )
      )
    );
  }, [queryClient]);

  React.useEffect(() => {
    if (pickerPrefetchedRef.current) return;
    if (!deck.currentPokemon?.rawName) return;

    pickerPrefetchedRef.current = true;
    const timer = window.setTimeout(() => {
      warmPokemonPicker();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [deck.currentPokemon?.rawName, warmPokemonPicker]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (isTypingTarget) {
        if (event.key === "Escape") {
          setPickerOpen(false);
        }
        return;
      }

      if (pickerOpen || panelOpen || summaryOpen || shell.helpOpen) {
        if (event.key === "Escape") {
          setPickerOpen(false);
          setPanelOpen(false);
          setSummaryOpen(false);
          shell.setHelpOpen(false);
        }
        return;
      }

      if (options.smashPassMode && event.key === "ArrowLeft") {
        swipe("pass");
      }
      if (options.smashPassMode && event.key === "ArrowRight") {
        swipe("smash");
      }
      if (event.key.toLowerCase() === "z" && (event.metaKey || event.ctrlKey)) {
        undoLast();
      }
      if (event.key === "Escape") {
        setPanelOpen(false);
        setPickerOpen(false);
        setSummaryOpen(false);
        shell.setHelpOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickerOpen,
    panelOpen,
    summaryOpen,
    shell,
    swipeStack.length,
    isAnimatingSwipe,
    isShuffling,
    options.smashPassMode,
    deck.currentPokemon?.rawName,
    gallery,
    currentImage
  ]);

  const onToggleGen = (genId: number) => {
    setFilters((prev) => {
      const next = new Set(prev.gens);
      if (next.has(genId)) next.delete(genId);
      else next.add(genId);
      return { ...prev, gens: Array.from(next).sort((a, b) => a - b) };
    });
  };

  const onToggleType = (type: PokemonTypeName) => {
    setFilters((prev) => {
      const next = new Set(prev.types);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return { ...prev, types: Array.from(next) };
    });
  };

  const onChangeOption = React.useCallback(
    <K extends keyof SmashOptionsStorage>(
      key: K,
      value: SmashOptionsStorage[K]
    ) => {
      setOptions((prev) => ({ ...prev, [key]: value }));
    },
    [setOptions]
  );

  const onToggleStats = () => {
    const next = !showStats;
    setShowStats(next);
    if (!next) {
      setOptions((prev) => ({ ...prev, autoReveal: false }));
    }
  };

  return (
    <>
      <CornerPokeballMenu
        undoCount={swipeStack.length}
        undoDisabled={
          !deck.currentPokemon ||
          isAnimatingSwipe ||
          isShuffling ||
          swipeStack.length === 0
        }
        onUndo={undoLast}
        onOpenFilters={() => setPanelOpen(true)}
      />

      <Box
        sx={{
          minHeight: "100%",
          width: "100%",
          minWidth: 0,
          overflowX: { xs: "clip", md: "visible" },
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 1.35fr) 360px" },
          alignItems: "start",
          gap: 0
        }}
      >
        <Stack
          sx={{
            minHeight: {
              xs: "calc(var(--app-height, 100dvh) - env(safe-area-inset-top))",
              xl: "auto"
            },
            width: "100%",
            minWidth: 0,
            flex: 1
          }}
        >
          {!isMobile ? (
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 0,
                backgroundColor: "background.paper",
                borderColor: "divider"
              }}
            >
              <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", lg: "flex-start" }}
              >
                <Stack spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="overline" color="text.secondary">
                    {strings.shell.desktopOverline}
                  </Typography>
                  <Typography
                    variant="h1"
                    sx={{ fontSize: { xs: "2.1rem", md: "3rem" } }}
                  >
                    {strings.page.heroTitle}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ maxWidth: 760 }}
                  >
                    {strings.page.heroBody}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip color="secondary" label={deck.statusText} />
                    <Chip
                      variant="outlined"
                      label={strings.page.savedPokemon(favorites.length)}
                    />
                    <Chip
                      variant="outlined"
                      label={strings.page.totalVotes(
                        history.smashCount + history.passCount
                      )}
                    />
                  </Stack>
                </Stack>
                <ThemeModeToggle />
              </Stack>
            </Paper>
          ) : null}

          <Box
            sx={{
              display: "flex",
              flex: 1,
              width: "100%",
              minWidth: 0,
              minHeight: { xs: 0, md: "auto" },
              "& > *": {
                flex: 1,
                minWidth: 0
              }
            }}
          >
            <PokemonCard
              pokemon={deck.currentPokemon}
              emptyTitle={isDeckEmpty ? strings.page.emptyTitle : undefined}
              emptyBody={isDeckEmpty ? strings.page.emptyBody : undefined}
              isFavorite={isFavorite}
              showStats={showStats}
              shinyMode={options.shinyMode}
              cardShellClassName={isShuffling ? "is-shuffling" : undefined}
              swipeStatus={swipeStatus}
              isDragging={swipeApi.isDragging}
              transform={swipeApi.transform}
              currentImage={currentImage}
              gallery={gallery}
              onSelectImage={setCurrentImage}
              onCycleImage={handleCycleImage}
              onToggleFavorite={toggleFavorite}
              onPreparePokemonPicker={warmPokemonPicker}
              onOpenPokemonPicker={() => setPickerOpen(true)}
              onToggleStats={onToggleStats}
              onPlayCry={playCry}
              cryDisabled={!deck.currentPokemon?.cry}
              cryPlaying={cryPlaying}
              pointerHandlers={swipeApi.handlers}
            />
          </Box>

          <ActionRow
            disabled={!deck.currentPokemon || isAnimatingSwipe || isShuffling}
            isShuffling={isShuffling}
            votingEnabled={options.smashPassMode}
            onPass={() => swipe("pass")}
            onSmash={() => swipe("smash")}
            onShuffle={shuffleDeck}
          />

          {!isMobile ? (
            <Paper
              variant="outlined"
              sx={{ p: 1.5, borderRadius: 0, bgcolor: "background.paper" }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="space-between"
              >
                <Typography variant="body2" color="text.secondary">
                  {options.smashPassMode
                    ? strings.page.votingTip
                    : strings.page.guideTip}
                </Typography>
                <Button
                  color="secondary"
                  variant="text"
                  startIcon={<ShuffleRoundedIcon />}
                  onClick={shuffleDeck}
                  disabled={isShuffling}
                >
                  {strings.page.refreshDeck}
                </Button>
              </Stack>
            </Paper>
          ) : null}
        </Stack>

        {!isMobile ? (
          <SessionPanel
            statusText={deck.statusText}
            queueLeft={deck.queue.length}
            smashCount={history.smashCount}
            passCount={history.passCount}
            smashStreak={smashStreak}
            passStreak={passStreak}
            favoritesCount={favorites.length}
            badges={badges}
            recentSmash={history.smash.slice(-6).reverse()}
            recentPass={history.pass.slice(-6).reverse()}
          />
        ) : null}
      </Box>

      <FiltersPanel
        open={panelOpen}
        filters={filters}
        options={options}
        history={history}
        favorites={favorites}
        badges={badges}
        onClose={() => setPanelOpen(false)}
        onSetAllGens={() =>
          setFilters((prev) => ({
            ...prev,
            gens: Array.from({ length: GEN_TOTAL }, (_, i) => i + 1)
          }))
        }
        onClearGens={() => setFilters((prev) => ({ ...prev, gens: [] }))}
        onToggleGen={onToggleGen}
        onSetAllTypes={() =>
          setFilters((prev) => ({ ...prev, types: [...TYPE_LIST] }))
        }
        onClearTypes={() => setFilters((prev) => ({ ...prev, types: [] }))}
        onToggleType={onToggleType}
        onChangeOption={onChangeOption}
        onClearHistory={clearHistory}
        onExportJson={exportFavoritesJson}
        onExportCsv={exportFavoritesCsv}
        onShareCard={shareMatchCard}
      />

      <SummaryModal
        open={summaryOpen}
        summary={summaryData}
        onClose={() => setSummaryOpen(false)}
      />

      <PokemonPickerModal
        open={pickerOpen}
        currentPokemonName={deck.currentPokemon?.rawName || ""}
        onClose={() => setPickerOpen(false)}
        onSelectPokemon={handleSelectPokemon}
      />
    </>
  );
};
