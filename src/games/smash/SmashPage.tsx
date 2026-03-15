import { useShell } from "@/app/providers/ShellProvider";
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
import type { Pokemon } from "@/lib/pokeapi/types";
import { useLocalStorageState } from "@/lib/storage";
import { capitalize } from "@/lib/text";
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
  useMediaQuery,
  useTheme
} from "@mui/material";
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
  statTotals
}: {
  smashStreak: number;
  passStreak: number;
  smashCount: number;
  typeCounts: Record<string, number>;
  statTotals: Record<string, number>;
}) => {
  const badges: string[] = [];
  if (smashStreak >= 5) badges.push("Hot Streak");
  if (passStreak >= 5) badges.push("Cold Streak");

  const typeEntries = Object.entries(typeCounts)
    .map(([type, count]) => [type, Number(count) || 0] as const)
    .sort((a, b) => b[1] - a[1]);
  if (typeEntries[0]?.[1] >= 6) {
    badges.push(`${capitalize(typeEntries[0][0])} Loyalist`);
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

    if (avgSpeed >= 90) badges.push("Speed Demon");
    if (avgAtk + avgSpAtk >= 160 && avgDef + avgSpDef < 120) {
      badges.push("Glass Cannon");
    }
    if (avgDef + avgSpDef >= 160) badges.push("Tank Mode");
  }

  return Array.from(new Set(badges)).slice(0, 5);
};

const buildSummary = (history: SmashHistoryStorage): SmashSummary => {
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
    .map(([type, count]) => ({ type: capitalize(type), count }));

  const totals = history.statTotals ?? {};
  const avgStats = [
    "attack",
    "defense",
    "special-attack",
    "special-defense",
    "speed"
  ].map((key) => ({
    label: capitalize(key.replace("-", " ")),
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

const buildSmashHelpBody = () => (
  <Stack spacing={1.2}>
    {[
      ["Swipe", "Drag left or right"],
      ["Keys", "Left = Pass, Right = Smash"],
      ["Undo", "Cmd/Ctrl + Z"],
      ["Shuffle", "Swipe up on mobile"],
      ["Peek", "Show or hide stats"]
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
  const [open, setOpen] = React.useState(false);

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
                  {undoCount ? `Undo ${undoCount}` : "Undo"}
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
                  Filters
                </Button>
              </Stack>
            </Paper>
          ) : null}

          <Box
            component="button"
            type="button"
            aria-label="Open deck tools"
            aria-expanded={open}
            aria-controls="smash-corner-menu"
            onClick={() => setOpen((prev) => !prev)}
            sx={{
              width: { xs: 40, sm: 60 },
              height: { xs: 40, sm: 60 },
              borderRadius: "50%",
              border: "3px solid #141414",
              padding: 0,
              cursor: "pointer",
              position: "relative",
              display: "block",
              background:
                "linear-gradient(180deg, #e64b3b 0 46%, #121212 46% 56%, #f6f1e8 56% 100%)",
              boxShadow:
                "0 14px 28px rgba(16, 24, 40, 0.24), inset 0 2px 0 rgba(255,255,255,0.4)",
              transition: "transform 160ms ease, box-shadow 160ms ease",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: "50% auto auto 50%",
                width: 18,
                height: 18,
                transform: "translate(-50%, -50%)",
                borderRadius: "50%",
                border: "3px solid #141414",
                bgcolor: "#f8f4ec",
                boxShadow: "0 0 0 4px rgba(255,255,255,0.35)"
              },
              "&::after": {
                content: '""',
                position: "absolute",
                left: "50%",
                top: "50%",
                width: "100%",
                height: 6,
                transform: "translate(-50%, -50%)",
                bgcolor: "#141414"
              },
              "&:hover": {
                transform: "translateY(-1px) scale(1.02)",
                boxShadow:
                  "0 18px 36px rgba(16, 24, 40, 0.28), inset 0 2px 0 rgba(255,255,255,0.42)"
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
  const statCards = [
    {
      label: "Deck left",
      value: queueLeft,
      icon: <TravelExploreRoundedIcon fontSize="small" />
    },
    {
      label: "Smash",
      value: smashCount,
      icon: <FavoriteRoundedIcon fontSize="small" />
    },
    {
      label: "Pass",
      value: passCount,
      icon: <HistoryRoundedIcon fontSize="small" />
    },
    {
      label: "Saved",
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
                Session pulse
              </Typography>
              <Typography variant="h3">Control center</Typography>
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
              <Chip color="success" label={`Smash streak ${smashStreak}`} />
            ) : null}
            {passStreak > 0 ? (
              <Chip color="error" label={`Pass streak ${passStreak}`} />
            ) : null}
            {!smashStreak && !passStreak ? (
              <Chip variant="outlined" label="No current streak" />
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 0 }}>
        <Stack spacing={1.25}>
          <Typography variant="h3">Matchup badges</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {badges.length ? (
              badges.map((badge) => (
                <Chip key={badge} color="primary" label={badge} />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                Your deck personality shows up here after a few rounds.
              </Typography>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 0 }}>
        <Stack spacing={1.25}>
          <Typography variant="h3">Deck rhythm</Typography>
          <Typography variant="body2" color="text.secondary">
            Keep the card open as your field guide, save favorites for later,
            and use the filter drawer to tighten the pool when you want a more
            curated SmashDex run.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip color="secondary" label="Save favorites" />
            <Chip variant="outlined" label="Filter by gen and type" />
            <Chip variant="outlined" label="Shuffle when the deck gets stale" />
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 0 }}>
        <Stack spacing={1.25}>
          <Typography variant="h3">Recent picks</Typography>
          <Typography variant="subtitle2">Smash list</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {recentSmash.length ? (
              recentSmash.map((entry, idx) => (
                <Chip
                  key={`${entry.name}-${idx}`}
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
                No smash picks yet.
              </Typography>
            )}
          </Stack>
          <Typography variant="subtitle2">Pass list</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {recentPass.length ? (
              recentPass.map((entry, idx) => (
                <Chip
                  key={`${entry.name}-${idx}`}
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
                No passes yet.
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

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
    shell.setHeader({ title: "SmashDex", category: "Smash / Pass" });
    shell.setHelp({ title: "Controls", body: buildSmashHelpBody() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const badges = React.useMemo(
    () =>
      buildBadges({
        smashStreak,
        passStreak,
        smashCount: history.smashCount,
        typeCounts: (history.typeCounts ?? {}) as Record<string, number>,
        statTotals: (history.statTotals ?? {}) as Record<string, number>
      }),
    [
      history.smashCount,
      history.statTotals,
      history.typeCounts,
      passStreak,
      smashStreak
    ]
  );

  React.useEffect(() => {
    shell.setStatus(deck.statusText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.statusText]);

  React.useEffect(() => {
    shell.setScoreboard(
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip color="success" label={`Smash ${history.smashCount}`} />
        <Chip
          variant="outlined"
          color="error"
          label={`Pass ${history.passCount}`}
        />
      </Stack>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.passCount, history.smashCount]);

  React.useEffect(() => {
    void deck.rebuildQueue();
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
  }, [deck.currentPokemon?.rawName, options.shinyMode]);

  React.useEffect(() => {
    setShowStats(options.autoReveal);
  }, [deck.currentPokemon?.rawName, options.autoReveal]);

  const isFavorite = Boolean(
    deck.currentPokemon &&
    favorites.some((fav) => fav.name === deck.currentPokemon!.name)
  );

  const toggleFavorite = () => {
    const pokemon = deck.currentPokemon;
    if (!pokemon) return;
    setFavorites((prev) => {
      const existingIndex = prev.findIndex((fav) => fav.name === pokemon.name);
      if (existingIndex >= 0) {
        const next = [...prev];
        next.splice(existingIndex, 1);
        return next;
      }
      const entry: HistoryEntry = {
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
    ctx.fillText("SmashDex", 40, 70);
    ctx.font = "18px IBM Plex Sans, sans-serif";
    ctx.fillText(
      `Smash ${history.smashCount} · Pass ${history.passCount}`,
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
            title: "SmashDex"
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
      setSummaryData(buildSummary(next));
      setSummaryOpen(true);
    }
  };

  const swipe = (direction: SwipeDirection) => {
    if (!deck.currentPokemon) return;
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
    disabled: isAnimatingSwipe || isShuffling || !deck.currentPokemon,
    isShuffling,
    onSwipe: swipe,
    onShuffle: shuffleDeck,
    shouldIgnoreEvent: (target) =>
      target instanceof Element &&
      Boolean(
        target.closest(
          "button, input, label, [data-card-swipe-ignore='true']"
        )
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
    !deck.currentPokemon &&
    deck.statusText.toLowerCase().startsWith("deck empty");

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

      if (event.key === "ArrowLeft") {
        swipe("pass");
      }
      if (event.key === "ArrowRight") {
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
  }, [
    pickerOpen,
    panelOpen,
    summaryOpen,
    shell,
    swipeStack.length,
    isAnimatingSwipe,
    isShuffling,
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
              <Stack spacing={1.5}>
                <Typography variant="overline" color="text.secondary">
                  Mobile-first deck
                </Typography>
                <Typography
                  variant="h1"
                  sx={{ fontSize: { xs: "2.1rem", md: "3rem" } }}
                >
                  Swipe fast. Study deeper. Hand off better clues.
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ maxWidth: 760 }}
                >
                  SmashDex now behaves more like a pocket field guide on mobile:
                  the important controls stay thumb-ready, the card keeps all
                  its data, and the whole experience stays focused on Smash or
                  Pass instead of splitting attention across extra modes.
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip color="secondary" label={deck.statusText} />
                  <Chip
                    variant="outlined"
                    label={`${favorites.length} saved Pokemon`}
                  />
                  <Chip
                    variant="outlined"
                    label={`${history.smashCount + history.passCount} total votes`}
                  />
                </Stack>
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
              emptyTitle={isDeckEmpty ? "No Pokemon" : undefined}
              emptyBody={
                isDeckEmpty
                  ? "Choose more generations or types to keep swiping."
                  : undefined
              }
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
                  Tip: swipe left or right to vote, tap the art to cycle images,
                  and use the new control drawer when you want filters, history,
                  or exports.
                </Typography>
                <Button
                  color="secondary"
                  variant="text"
                  startIcon={<ShuffleRoundedIcon />}
                  onClick={shuffleDeck}
                  disabled={isShuffling}
                >
                  Refresh the deck
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
