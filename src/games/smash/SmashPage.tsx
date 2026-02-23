import React from "react";
import { useShell } from "@/app/providers/ShellProvider";
import { downloadDataUrl, downloadFile } from "@/lib/files";
import { useLocalStorageState } from "@/lib/storage";
import { capitalize } from "@/lib/text";
import { cn } from "@/lib/utils";
import type { Pokemon } from "@/lib/pokeapi/types";
import { TYPE_LIST, type PokemonTypeName } from "@/lib/typeChart";
import {
  defaultFilters,
  defaultHistory,
  defaultOptions,
  FAVORITES_KEY,
  FILTER_KEY,
  MODE_KEY,
  OPTIONS_KEY,
  STORAGE_KEY,
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
import { PokemonCard } from "@/games/smash/components/PokemonCard";
import { ActionRow } from "@/games/smash/components/ActionRow";
import { QuickFilterBar } from "@/games/smash/components/QuickFilterBar";
import { FiltersPanel } from "@/games/smash/components/FiltersPanel";
import { MobileHub } from "@/games/smash/components/MobileHub";
import { SummaryModal, type SmashSummary } from "@/games/smash/components/SummaryModal";

const SUMMARY_INTERVAL = 20;
const SWIPE_ANIMATION_MS = 320;
const SHUFFLE_ANIMATION_MS = 520;
const GEN_TOTAL = 9;
const TYPE_TOTAL = TYPE_LIST.length;

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
  <div className="grid gap-2 text-sm">
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold">Swipe</span>
      <span className="text-muted-foreground">Drag card left/right</span>
    </div>
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold">Keys</span>
      <span className="text-muted-foreground">← Pass · → Smash</span>
    </div>
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold">Undo</span>
      <span className="text-muted-foreground">Cmd/Ctrl + Z</span>
    </div>
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold">Shuffle</span>
      <span className="text-muted-foreground">Swipe up (mobile)</span>
    </div>
    <div className="flex items-center justify-between gap-3">
      <span className="font-semibold">Stats</span>
      <span className="text-muted-foreground">Peek/Hide button</span>
    </div>
  </div>
);

export const SmashPage = () => {
  const shell = useShell();

  const initialFilters = React.useMemo(() => defaultFilters(), []);
  const initialOptions = React.useMemo(() => defaultOptions(), []);
  const initialHistory = React.useMemo(() => defaultHistory(), []);
  const initialFavorites = React.useMemo(() => [] as HistoryEntry[], []);

  const [filters, setFilters] = useLocalStorageState(FILTER_KEY, initialFilters, {
    parse: parseFilters
  });
  const [options, setOptions] = useLocalStorageState(OPTIONS_KEY, initialOptions, {
    parse: parseOptions
  });
  const [history, setHistory] = useLocalStorageState(STORAGE_KEY, initialHistory, {
    parse: parseHistory
  });
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
  const [summaryData, setSummaryData] = React.useState<SmashSummary | null>(null);

  const [panelOpen, setPanelOpen] = React.useState(false);
  const [mobileHubOpen, setMobileHubOpen] = React.useState(false);

  const [swipeStack, setSwipeStack] = React.useState<SwipeRecord[]>([]);
  const [smashStreak, setSmashStreak] = React.useState(0);
  const [passStreak, setPassStreak] = React.useState(0);

  const mobileHubRef = React.useRef<HTMLDivElement | null>(null);
  const mobileHubToggleRef = React.useRef<HTMLButtonElement | null>(null);

  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [cryPlaying, setCryPlaying] = React.useState(false);

  const stopCryPlayback = React.useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    audioRef.current = null;
    setCryPlaying(false);
  }, []);

  React.useEffect(() => {
    stopCryPlayback();
  }, [deck.currentPokemon?.rawName, stopCryPlayback]);

  const playCry = React.useCallback(async () => {
    const url = deck.currentPokemon?.cry || "";
    if (!url) return;
    stopCryPlayback();
    const audio = new Audio(url);
    audioRef.current = audio;
    setCryPlaying(true);

    const cleanup = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
      setCryPlaying(false);
    };

    audio.addEventListener("ended", cleanup, { once: true });
    audio.addEventListener("error", cleanup, { once: true });

    try {
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
    shell.setHeader({ category: "Smash / Pass" });
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
    [history.smashCount, history.statTotals, history.typeCounts, passStreak, smashStreak]
  );

  React.useEffect(() => {
    shell.setStatus(deck.statusText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.statusText]);

  React.useEffect(() => {
    shell.setScoreboard(
      <div className="flex items-center gap-2">
        <div className="score-pill">
          <span>Smash</span> <span>{history.smashCount}</span> - <span>Pass</span>{" "}
          <span>{history.passCount}</span>
        </div>
        <button
          ref={mobileHubToggleRef}
          className="pokeball-toggle"
          aria-controls="mobileHub"
          aria-expanded={mobileHubOpen}
          aria-label="Open controls"
          type="button"
          onClick={() => {
            setPanelOpen(false);
            setMobileHubOpen((prev) => !prev);
          }}
        >
          <span className="pokeball-toggle-core" aria-hidden="true" />
        </button>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.passCount, history.smashCount, mobileHubOpen]);

  React.useEffect(() => {
    document.body.classList.toggle("panel-open", panelOpen);
    return () => {
      document.body.classList.remove("panel-open");
    };
  }, [panelOpen]);

  React.useEffect(() => {
    document.body.classList.toggle("mobile-hub-open", mobileHubOpen);
    return () => {
      document.body.classList.remove("mobile-hub-open");
    };
  }, [mobileHubOpen]);

  React.useEffect(() => {
    if (!mobileHubOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (mobileHubRef.current?.contains(target)) return;
      if (mobileHubToggleRef.current?.contains(target)) return;
      setMobileHubOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [mobileHubOpen]);

  React.useEffect(() => {
    // Rebuild the deck whenever deck-building inputs change.
    void deck.rebuildQueue();
  }, [deck.rebuildQueue]);

  React.useEffect(() => {
    const pokemon = deck.currentPokemon;
    if (!pokemon) {
      setGallery([]);
      setCurrentImage(null);
      return;
    }

    const baseImage = options.shinyMode ? pokemon.images.shiny : pokemon.images.main;
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
    downloadFile("smashdex-favorites.csv", [header, ...rows].join("\n"), "text/csv");
  };

  const shareMatchCard = async () => {
    const items = (favorites.length ? favorites : history.smash).slice(0, 8);
    if (!items.length) return;

    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 520;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#ffe9c7");
    gradient.addColorStop(1, "#c4f3e8");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#14130f";
    ctx.font = "36px Bungee, sans-serif";
    ctx.fillText("SmashDex", 40, 70);
    ctx.font = "18px IBM Plex Sans, sans-serif";
    ctx.fillText(`Smash ${history.smashCount} · Pass ${history.passCount}`, 40, 105);

    const startX = 40;
    const startY = 150;
    const gap = 110;
    const rowGap = 150;

    const images = await Promise.all(items.map((item) => loadImage(item.thumb)));

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

    if (deck.currentPokemon?.rawName && last.pokemon.rawName !== deck.currentPokemon.rawName) {
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
    setMobileHubOpen(false);
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
      target instanceof Element && Boolean(target.closest("button, input, label"))
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

  const selectedGenCount = filters.gens.length;
  const selectedTypeCount = filters.types.length;

  const isDeckEmpty =
    !deck.currentPokemon && deck.statusText.toLowerCase().startsWith("deck empty");

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
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
        setMobileHubOpen(false);
        setSummaryOpen(false);
        shell.setHelpOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shell, swipeStack.length, isAnimatingSwipe, isShuffling, deck.currentPokemon?.rawName, gallery, currentImage]);

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
    <K extends keyof SmashOptionsStorage>(key: K, value: SmashOptionsStorage[K]) => {
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
    <div className="layout">
      <section className="deck">
        <QuickFilterBar
          genCount={selectedGenCount}
          genTotal={GEN_TOTAL}
          typeCount={selectedTypeCount}
          typeTotal={TYPE_TOTAL}
          dailyDeck={options.dailyDeck}
          shinyMode={options.shinyMode}
          panelOpen={panelOpen}
          onToggleDailyDeck={() => onChangeOption("dailyDeck", !options.dailyDeck)}
          onToggleShinyMode={() => onChangeOption("shinyMode", !options.shinyMode)}
          onOpenFilters={() => {
            setPanelOpen(true);
            setMobileHubOpen(false);
          }}
        />

        <div className="deck-core">
          <PokemonCard
            pokemon={deck.currentPokemon}
            emptyTitle={isDeckEmpty ? "No Pokemon" : undefined}
            emptyBody={
              isDeckEmpty ? "Choose more generations to keep swiping." : undefined
            }
            isFavorite={isFavorite}
            showStats={showStats}
            shinyMode={options.shinyMode}
            cardShellClassName={cn(isShuffling && "is-shuffling")}
            swipeStatus={swipeStatus}
            isDragging={swipeApi.isDragging}
            transform={swipeApi.transform}
            currentImage={currentImage}
            gallery={gallery}
            onSelectImage={setCurrentImage}
            onCycleImage={handleCycleImage}
            onToggleFavorite={toggleFavorite}
            onToggleStats={onToggleStats}
            onPlayCry={playCry}
            cryDisabled={!deck.currentPokemon?.cry}
            cryPlaying={cryPlaying}
            pointerHandlers={swipeApi.handlers}
          />

          <ActionRow
            disabled={!deck.currentPokemon || isAnimatingSwipe || isShuffling}
            isShuffling={isShuffling}
            undoCount={swipeStack.length}
            onPass={() => {
              swipe("pass");
              setMobileHubOpen(false);
            }}
            onSmash={() => {
              swipe("smash");
              setMobileHubOpen(false);
            }}
            onUndo={() => {
              undoLast();
              setMobileHubOpen(false);
            }}
            onShuffle={shuffleDeck}
          />

          <div className="hint">
            <span className="hint-desktop">
              Tip: swipe with your trackpad or use left/right arrow keys.
            </span>
            <span className="hint-mobile">
              Tip: swipe left or right to vote, swipe up to shuffle.
            </span>
          </div>
        </div>
      </section>

      <FiltersPanel
        open={panelOpen}
        filters={filters}
        options={options}
        history={history}
        favorites={favorites}
        badges={badges}
        onClose={() => setPanelOpen(false)}
        onSetAllGens={() => setFilters((prev) => ({ ...prev, gens: Array.from({ length: GEN_TOTAL }, (_, i) => i + 1) }))}
        onClearGens={() => setFilters((prev) => ({ ...prev, gens: [] }))}
        onToggleGen={onToggleGen}
        onSetAllTypes={() => setFilters((prev) => ({ ...prev, types: [...TYPE_LIST] }))}
        onClearTypes={() => setFilters((prev) => ({ ...prev, types: [] }))}
        onToggleType={onToggleType}
        onChangeOption={onChangeOption}
        onClearHistory={clearHistory}
        onExportJson={exportFavoritesJson}
        onExportCsv={exportFavoritesCsv}
        onShareCard={shareMatchCard}
      />

      <button
        type="button"
        className={cn("panel-overlay", panelOpen && "is-open")}
        aria-hidden={!panelOpen}
        tabIndex={panelOpen ? 0 : -1}
        onClick={() => setPanelOpen(false)}
      >
        <span className="sr-only">Close filters panel</span>
      </button>

      <MobileHub
        hubRef={mobileHubRef}
        open={mobileHubOpen}
        statusText={deck.statusText}
        smashCount={history.smashCount}
        passCount={history.passCount}
        undoCount={swipeStack.length}
        keepHistory={options.keepHistory}
        favorites={favorites}
        smashHistory={history.smash}
        passHistory={history.pass}
        onClose={() => setMobileHubOpen(false)}
        onHelp={() => {
          shell.setHelpOpen(true);
          setMobileHubOpen(false);
        }}
        onOpenFilters={() => {
          setPanelOpen(true);
          setMobileHubOpen(false);
        }}
        onPass={() => {
          swipe("pass");
          setMobileHubOpen(false);
        }}
        onSmash={() => {
          swipe("smash");
          setMobileHubOpen(false);
        }}
        onUndo={() => {
          undoLast();
          setMobileHubOpen(false);
        }}
        onShuffle={() => {
          void shuffleDeck();
          setMobileHubOpen(false);
        }}
      />

      <SummaryModal
        open={summaryOpen}
        summary={summaryData}
        onClose={() => setSummaryOpen(false)}
      />
    </div>
  );
};
