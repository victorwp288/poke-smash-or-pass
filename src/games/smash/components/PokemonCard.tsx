import { getSpriteScale } from "@/games/smash/smashLogic";
import { CATEGORY_LABELS, TYPE_COLORS, TYPE_ICON_FILES } from "@/lib/constants";
import {
  parseStoneMethodLabel,
  splitEvolutionEntryVariants
} from "@/lib/pokeapi/evolution";
import type { Pokemon } from "@/lib/pokeapi/types";
import { capitalize, formatId, normalizeInlineText } from "@/lib/text";
import type { PokemonTypeName } from "@/lib/typeChart";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import GraphicEqOutlinedIcon from "@mui/icons-material/GraphicEqOutlined";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowUpRoundedIcon from "@mui/icons-material/KeyboardArrowUpRounded";
import {
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme
} from "@mui/material";
import React from "react";

type SwipeStatus = "" | "smash" | "pass";

type PokemonCardProps = {
  pokemon: Pokemon | null;
  emptyTitle?: string;
  emptyBody?: string;
  isFavorite: boolean;
  showStats: boolean;
  shinyMode: boolean;
  cardShellClassName?: string;
  swipeStatus: SwipeStatus;
  isDragging: boolean;
  transform: string;
  currentImage: string | null;
  gallery: string[];
  onSelectImage: (url: string) => void;
  onCycleImage: (direction: "prev" | "next") => void;
  onToggleFavorite: () => void;
  onToggleStats: () => void;
  onPlayCry: () => void;
  cryDisabled: boolean;
  cryPlaying: boolean;
  pointerHandlers: {
    onPointerDown: React.PointerEventHandler<HTMLElement>;
    onPointerMove: React.PointerEventHandler<HTMLElement>;
    onPointerUp: React.PointerEventHandler<HTMLElement>;
    onPointerCancel: React.PointerEventHandler<HTMLElement>;
  };
};

const getTypeIconUrl = (type: PokemonTypeName) => {
  const file = TYPE_ICON_FILES[type];
  if (!file) return "";
  return `icons/types/${file}`;
};

const formatMeters = (decimeters: number) =>
  Number.isFinite(decimeters) ? (decimeters / 10).toFixed(1) : "?";

const formatKilograms = (hectograms: number) =>
  Number.isFinite(hectograms) ? (hectograms / 10).toFixed(1) : "?";

const STAT_SHORT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  "special-attack": "SpA",
  "special-defense": "SpD",
  speed: "Spe"
};

const stopPointer = (
  event:
    | React.MouseEvent<HTMLElement>
    | React.PointerEvent<HTMLElement>
    | React.TouchEvent<HTMLElement>
) => {
  event.stopPropagation();
};

const VitalPill = ({
  label,
  value,
  icon,
  iconAlt,
  highlighted = false
}: {
  label: string;
  value: string;
  icon?: string;
  iconAlt?: string;
  highlighted?: boolean;
}) => {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      sx={{
        width: "100%",
        height: "100%",
        px: 1.25,
        py: 1,
        borderRadius: 0,
        minWidth: 0,
        borderColor: highlighted ? "secondary.main" : "divider",
        bgcolor: highlighted
          ? alpha(theme.palette.secondary.main, 0.1)
          : "background.paper"
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        {icon ? (
          <Box
            component="img"
            src={icon}
            alt={iconAlt || ""}
            sx={{ width: 18, height: 18 }}
          />
        ) : null}
        <div style={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block" }}
          >
            {label}
          </Typography>
          <Typography
            variant={highlighted ? "body1" : "body2"}
            fontWeight={highlighted ? 800 : 700}
          >
            {value}
          </Typography>
        </div>
      </Stack>
    </Paper>
  );
};

const AbilityTabs = ({ abilities }: { abilities: Pokemon["abilities"] }) => {
  const sorted = React.useMemo(() => {
    if (!abilities?.length) return [];
    return [...abilities].sort((a, b) => {
      const hiddenOrder = Number(a.isHidden) - Number(b.isHidden);
      if (hiddenOrder !== 0) return hiddenOrder;
      return (a.slot || 99) - (b.slot || 99);
    });
  }, [abilities]);

  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [sorted.length]);

  if (!sorted.length) return null;

  return (
    <Stack spacing={1.25}>
      <Typography variant="subtitle2">Abilities</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {sorted.map((ability, index) => {
          const isActive = index === activeIndex;
          return (
            <Chip
              key={`${ability.name}-${index}`}
              clickable
              onClick={() => setActiveIndex(index)}
              color={isActive ? "secondary" : "default"}
              label={`${capitalize(ability.name)}${ability.isHidden ? " · Hidden" : ""}`}
            />
          );
        })}
      </Stack>
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 0 }}>
        <Typography variant="body2" color="text.secondary">
          {normalizeInlineText(
            sorted[activeIndex]?.description || "No description available yet."
          )}
        </Typography>
      </Paper>
    </Stack>
  );
};

const StatList = ({ stats }: { stats: Pokemon["stats"] }) => {
  const total = (stats || []).reduce(
    (sum, stat) => sum + (Number(stat?.base_stat) || 0),
    0
  );

  return (
    <Stack spacing={1.1}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="baseline"
      >
        <Typography variant="subtitle2">Battle stats</Typography>
        <Typography variant="caption" color="text.secondary">
          Total {total}
        </Typography>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 1
        }}
      >
        {(stats || []).map((stat) => (
          <Paper
            key={stat.stat.name}
            variant="outlined"
            sx={{
              px: 1.25,
              py: 1,
              borderRadius: 0,
              bgcolor: "background.paper"
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="baseline"
            >
              <Typography variant="caption" color="text.secondary">
                {STAT_SHORT_LABELS[stat.stat.name] ||
                  capitalize(stat.stat.name)}
              </Typography>
              <Typography variant="body1" fontWeight={700}>
                {stat.base_stat}
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
};

const EvolutionLine = ({ pokemon }: { pokemon: Pokemon }) => {
  const theme = useTheme();
  const stages = pokemon.evolution;
  if (!Array.isArray(stages) || stages.length === 0) return null;
  const totalEntries = stages.reduce(
    (sum, stage) => sum + (stage?.length || 0),
    0
  );
  if (totalEntries <= 1) return null;

  return (
    <Stack spacing={0.9}>
      <Typography variant="subtitle2">Evolution line</Typography>
      <Box
        data-card-swipe-ignore="true"
        sx={{
          overflowX: "auto",
          overscrollBehaviorX: "contain",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper"
        }}
      >
        <Stack
          direction="row"
          alignItems="stretch"
          sx={{ width: "max-content", minWidth: "100%" }}
        >
          {stages.map((stage, stageIndex) => (
            <React.Fragment key={`stage-${stageIndex}`}>
              {stageIndex > 0 ? (
                <Stack
                  justifyContent="center"
                  alignItems="center"
                  sx={{
                    px: 1,
                    borderInline: "1px solid",
                    borderColor: "divider",
                    color: "primary.main"
                  }}
                >
                  <ArrowForwardRoundedIcon />
                </Stack>
              ) : null}
              <Stack
                sx={{
                  minWidth: { xs: 180, sm: 220 },
                  borderRight:
                    stageIndex === stages.length - 1 ? "none" : undefined,
                  borderColor: "divider"
                }}
              >
                {stage.flatMap((entry) =>
                  splitEvolutionEntryVariants(entry).map(
                    (variant, variantIdx) => {
                      const isVariantLabel = variant.label !== entry.label;
                      const isCurrent =
                        entry.name === pokemon.rawName && !isVariantLabel;
                      return (
                        <Box
                          key={`${entry.name}-${variant.label}-${stageIndex}`}
                          sx={{
                            px: 1.25,
                            py: 1,
                            borderTop:
                              variantIdx > 0
                                ? "1px solid rgba(16, 24, 40, 0.14)"
                                : 0,
                            borderLeft: isCurrent
                              ? `3px solid ${theme.palette.primary.main}`
                              : "3px solid transparent"
                          }}
                        >
                          <Stack spacing={0.75}>
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="center"
                              sx={{ minWidth: 0 }}
                            >
                              <Box
                                component="img"
                                alt={`${variant.label} sprite`}
                                src={entry.sprite || undefined}
                                sx={{
                                  width: 40,
                                  height: 40,
                                  objectFit: "contain",
                                  filter: entry.sprite ? "none" : "grayscale(1)"
                                }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  fontWeight={700}
                                  sx={{ overflowWrap: "anywhere" }}
                                >
                                  {variant.label}
                                </Typography>
                                {entry.isLaterGenEvolution &&
                                entry.generation ? (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Gen {entry.generation}
                                  </Typography>
                                ) : null}
                              </div>
                            </Stack>
                            {entry.typeNames.length ? (
                              <Stack
                                direction="row"
                                spacing={0.75}
                                flexWrap="wrap"
                                useFlexGap
                                sx={{ minWidth: 0 }}
                              >
                                {renderTypeChips(entry.typeNames, "small")}
                              </Stack>
                            ) : null}
                            {variant.methodLabels.length ? (
                              <Stack
                                direction="row"
                                spacing={0.5}
                                flexWrap="wrap"
                                useFlexGap
                                sx={{ minWidth: 0 }}
                              >
                                {variant.methodLabels.map((methodLabel) => {
                                  const stoneMethod =
                                    parseStoneMethodLabel(methodLabel);
                                  if (stoneMethod) {
                                    return (
                                      <Chip
                                        key={`${entry.name}-${methodLabel}`}
                                        size="small"
                                        avatar={
                                          <AvatarLike
                                            src={stoneMethod.sprite}
                                            alt={`${stoneMethod.label} icon`}
                                          />
                                        }
                                        label={`${stoneMethod.label}${stoneMethod.extraLabel ? ` · ${stoneMethod.extraLabel}` : ""}`}
                                        sx={{
                                          maxWidth: "100%",
                                          height: "auto",
                                          "& .MuiChip-label": {
                                            display: "block",
                                            whiteSpace: "normal",
                                            overflowWrap: "anywhere",
                                            paddingBlock: 0.35
                                          }
                                        }}
                                      />
                                    );
                                  }
                                  return (
                                    <Chip
                                      key={`${entry.name}-${methodLabel}`}
                                      size="small"
                                      label={methodLabel}
                                      sx={{
                                        maxWidth: "100%",
                                        height: "auto",
                                        "& .MuiChip-label": {
                                          display: "block",
                                          whiteSpace: "normal",
                                          overflowWrap: "anywhere",
                                          paddingBlock: 0.35
                                        }
                                      }}
                                    />
                                  );
                                })}
                              </Stack>
                            ) : null}
                          </Stack>
                        </Box>
                      );
                    }
                  )
                )}
              </Stack>
            </React.Fragment>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
};

const AvatarLike = ({ src, alt }: { src: string; alt: string }) => (
  <Box
    component="span"
    sx={{
      width: 24,
      height: 24,
      borderRadius: "50%",
      bgcolor: "rgba(255,255,255,0.85)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden"
    }}
  >
    <Box component="img" src={src} alt={alt} sx={{ width: 18, height: 18 }} />
  </Box>
);

const renderTypeChips = (
  typeNames: PokemonTypeName[],
  size: "small" | "medium" = "medium"
) =>
  typeNames.map((typeName) => (
    <Chip
      key={`${typeName}-${size}`}
      size={size}
      label={capitalize(typeName)}
      sx={{
        bgcolor: alpha(
          TYPE_COLORS[typeName] || "#f0f0f0",
          size === "small" ? 0.14 : 0.18
        ),
        color: "text.primary",
        maxWidth: "100%",
        "& .MuiChip-label": {
          px: size === "small" ? 0.9 : undefined
        }
      }}
      icon={
        <Box
          component="img"
          src={getTypeIconUrl(typeName)}
          alt=""
          sx={{
            width: size === "small" ? 14 : 16,
            height: size === "small" ? 14 : 16
          }}
        />
      }
    />
  ));

const MegaCapabilityChip = () => {
  const theme = useTheme();

  return (
    <Tooltip title="Mega-capable">
      <Chip
        aria-label="Mega-capable"
        color="warning"
        variant="outlined"
        label="Mega-capable"
        icon={
          <Box
            component="img"
            src="icons/megaevolution.webp"
            alt=""
            sx={{ width: 16, height: 16 }}
          />
        }
        sx={{
          width: 36,
          justifyContent: "center",
          bgcolor: alpha(theme.palette.warning.main, 0.12),
          "& .MuiChip-label": {
            display: "none"
          },
          "& .MuiChip-icon": {
            marginLeft: 0,
            marginRight: 0
          }
        }}
      />
    </Tooltip>
  );
};

const TypeBadges = ({ pokemon }: { pokemon: Pokemon }) => {
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {renderTypeChips(pokemon.typeNames)}
      {pokemon.canMegaEvolve ? <MegaCapabilityChip /> : null}
    </Stack>
  );
};

export const PokemonCard = ({
  pokemon,
  emptyTitle,
  emptyBody,
  isFavorite,
  showStats,
  shinyMode,
  cardShellClassName,
  swipeStatus,
  isDragging,
  transform,
  currentImage,
  gallery,
  onSelectImage,
  onCycleImage,
  onToggleFavorite,
  onToggleStats,
  onPlayCry,
  cryDisabled,
  cryPlaying,
  pointerHandlers
}: PokemonCardProps) => {
  const theme = useTheme();
  const [suppressImageClick, setSuppressImageClick] = React.useState(false);
  const imageSwipeRef = React.useRef({
    startX: 0,
    startY: 0,
    pointerId: null as number | null,
    active: false
  });

  React.useEffect(() => {
    if (!pokemon) return;
    const primaryType = pokemon.types[0]?.type?.name;
    const accent = (primaryType && TYPE_COLORS[primaryType]) || "#ff6b2d";
    document.documentElement.style.setProperty("--type-accent", accent);
  }, [pokemon?.rawName]);

  const baseImage =
    pokemon && shinyMode ? pokemon.images.shiny : pokemon?.images.main || "";

  React.useEffect(() => {
    if (!pokemon) return;
    const spriteScale = getSpriteScale(pokemon.height);
    const root = document.documentElement;
    root.style.setProperty("--sprite-scale", String(spriteScale));
  }, [pokemon?.rawName]);

  const handleMainImageClick = () => {
    if (suppressImageClick) {
      setSuppressImageClick(false);
      return;
    }
    onCycleImage("next");
  };

  const onImagePointerDown: React.PointerEventHandler<HTMLImageElement> = (
    event
  ) => {
    imageSwipeRef.current.startX = event.clientX;
    imageSwipeRef.current.startY = event.clientY;
    imageSwipeRef.current.pointerId = event.pointerId;
    imageSwipeRef.current.active = true;
    setSuppressImageClick(false);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    event.stopPropagation();
  };

  const onImagePointerMove: React.PointerEventHandler<HTMLImageElement> = (
    event
  ) => {
    if (!imageSwipeRef.current.active) return;
    const deltaX = event.clientX - imageSwipeRef.current.startX;
    const deltaY = event.clientY - imageSwipeRef.current.startY;
    if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
      setSuppressImageClick(true);
    }
    event.stopPropagation();
  };

  const onImagePointerUp: React.PointerEventHandler<HTMLImageElement> = (
    event
  ) => {
    if (!imageSwipeRef.current.active) return;
    const deltaX = event.clientX - imageSwipeRef.current.startX;
    const deltaY = event.clientY - imageSwipeRef.current.startY;
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
      onCycleImage(deltaX > 0 ? "prev" : "next");
    }
    imageSwipeRef.current.active = false;
    const pointerId = imageSwipeRef.current.pointerId;
    if (pointerId !== null) {
      try {
        if (event.currentTarget.hasPointerCapture(pointerId)) {
          event.currentTarget.releasePointerCapture(pointerId);
        }
      } catch {
        // ignore
      }
    }
    imageSwipeRef.current.pointerId = null;
    event.stopPropagation();
  };

  return (
    <Box
      className={cardShellClassName}
      sx={{ height: "100%", width: "100%", minWidth: 0 }}
    >
      <Paper
        elevation={0}
        data-status={swipeStatus}
        sx={{
          height: "100%",
          width: "100%",
          minWidth: 0,
          position: "relative",
          overflow: "hidden",
          borderRadius: 0,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: isDragging ? "0 0 0 1px rgba(217, 45, 32, 0.35)" : "none",
          transition: "box-shadow 180ms ease",
          transform: transform || undefined
        }}
        {...pointerHandlers}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={0}
          sx={{
            position: "relative",
            height: "100%",
            width: "100%",
            minWidth: 0
          }}
        >
          <Stack
            spacing={1}
            sx={{
              width: { xs: "100%", lg: "42%" },
              minWidth: 0,
              flexShrink: 0,
              p: 1.5
            }}
          >
            <Stack
              direction="row"
              justifyContent="flex-end"
              alignItems="center"
              sx={{ minWidth: 0 }}
            >
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ alignSelf: "flex-end" }}
              >
                <Tooltip
                  title={
                    isFavorite ? "Remove from saved Pokemon" : "Save Pokemon"
                  }
                >
                  <IconButton
                    color={isFavorite ? "error" : "default"}
                    onClick={(event) => {
                      stopPointer(event);
                      onToggleFavorite();
                    }}
                    onPointerDown={stopPointer}
                    aria-label={
                      isFavorite ? "Remove from saved Pokemon" : "Save Pokemon"
                    }
                  >
                    {isFavorite ? (
                      <FavoriteRoundedIcon />
                    ) : (
                      <FavoriteBorderRoundedIcon />
                    )}
                  </IconButton>
                </Tooltip>
                <Tooltip
                  title={
                    cryDisabled
                      ? "No cry available"
                      : cryPlaying
                        ? "Playing cry"
                        : "Play cry"
                  }
                >
                  <span>
                    <IconButton
                      color={cryPlaying ? "secondary" : "default"}
                      disabled={cryDisabled}
                      onClick={(event) => {
                        stopPointer(event);
                        onPlayCry();
                      }}
                      onPointerDown={stopPointer}
                      aria-label={
                        cryDisabled
                          ? "No cry available for this Pokemon"
                          : "Play Pokemon cry"
                      }
                    >
                      {cryPlaying ? (
                        <GraphicEqRoundedIcon />
                      ) : (
                        <GraphicEqOutlinedIcon />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>

            <Paper
              variant="outlined"
              sx={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 0,
                p: 1,
                minHeight: { xs: 240, sm: 320 },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "background.default"
              }}
            >
              <IconButton
                sx={{ position: "absolute", left: 12, zIndex: 2 }}
                onClick={(event) => {
                  stopPointer(event);
                  onCycleImage("prev");
                }}
                onPointerDown={stopPointer}
                aria-label="Previous artwork"
              >
                <ChevronLeftRoundedIcon />
              </IconButton>

              <Box
                component="img"
                alt={pokemon ? `${pokemon.name} artwork` : "Pokemon artwork"}
                src={currentImage || baseImage || undefined}
                onClick={handleMainImageClick}
                onPointerDown={onImagePointerDown}
                onPointerMove={onImagePointerMove}
                onPointerUp={onImagePointerUp}
                onPointerCancel={onImagePointerUp}
                sx={{
                  width: "100%",
                  maxWidth: 280,
                  maxHeight: { xs: 210, sm: 260 },
                  objectFit: "contain",
                  userSelect: "none"
                }}
              />

              <IconButton
                sx={{ position: "absolute", right: 12, zIndex: 2 }}
                onClick={(event) => {
                  stopPointer(event);
                  onCycleImage("next");
                }}
                onPointerDown={stopPointer}
                aria-label="Next artwork"
              >
                <ChevronRightRoundedIcon />
              </IconButton>
            </Paper>

            <Stack
              direction="row"
              spacing={1}
              sx={{ width: "100%", minWidth: 0, overflowX: "auto", pb: 0.5 }}
            >
              {gallery.map((url) => (
                <Box
                  key={url}
                  component="button"
                  type="button"
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                    stopPointer(event);
                    onSelectImage(url);
                  }}
                  onPointerDown={stopPointer}
                  sx={{
                    border: "1px solid",
                    borderColor:
                      url === currentImage
                        ? "secondary.main"
                        : alpha(theme.palette.text.primary, 0.12),
                    borderRadius: 0,
                    p: 0.5,
                    bgcolor:
                      url === currentImage
                        ? alpha(theme.palette.primary.main, 0.08)
                        : "background.paper",
                    cursor: "pointer",
                    minWidth: 64
                  }}
                >
                  <Box
                    component="img"
                    src={url}
                    alt="Pokemon alternate artwork"
                    sx={{ width: 48, height: 48, objectFit: "contain" }}
                  />
                </Box>
              ))}
            </Stack>
          </Stack>

          <Stack
            sx={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              flex: 1,
              borderLeft: { xs: 0, lg: "1px solid" },

              borderColor: "divider",
              p: 1.5
            }}
          >
            <Stack spacing={1} sx={{ minWidth: 0 }}>
              <Stack spacing={1} sx={{ minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontSize: { xs: "1.7rem", md: "2rem" },
                      overflowWrap: "anywhere",
                      mb: 1
                    }}
                  >
                    {pokemon?.name || emptyTitle || "Loading…"}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ mt: 0.5 }}
                  >
                    <Chip
                      size="small"
                      variant="outlined"
                      label={pokemon ? formatId(pokemon.id) : "#0000"}
                    />
                    {pokemon?.generation ? (
                      <Chip
                        size="small"
                        color="secondary"
                        label={`Generation ${pokemon.generation}`}
                      />
                    ) : null}
                    {pokemon?.category ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          CATEGORY_LABELS[pokemon.category] ||
                          capitalize(pokemon.category || "standard")
                        }
                      />
                    ) : null}
                  </Stack>
                </div>
              </Stack>

              {pokemon ? <TypeBadges pokemon={pokemon} /> : null}

              <Box
                sx={{
                  padding: 0.5,
                  borderRadius: 0,
                  bgcolor: "background.paper"
                }}
              >
                <Typography variant="body1">
                  {pokemon?.bio || emptyBody || ""}
                </Typography>
              </Box>

              {pokemon ? <EvolutionLine pokemon={pokemon} /> : null}
            </Stack>

            <Stack spacing={0.75} sx={{ mt: "auto", pt: 1 }}>
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  variant="text"
                  color="secondary"
                  size="small"
                  endIcon={
                    showStats ? (
                      <KeyboardArrowUpRoundedIcon fontSize="small" />
                    ) : (
                      <KeyboardArrowDownRoundedIcon fontSize="small" />
                    )
                  }
                  onClick={onToggleStats}
                  sx={{
                    minWidth: 0,
                    px: 0.75,
                    py: 0.25,
                    fontSize: "0.73rem",
                    letterSpacing: 0.15,
                    opacity: 0.74
                  }}
                >
                  {showStats ? "Hide stats" : "Peek stats"}
                </Button>
              </Stack>

              <Collapse in={showStats} timeout={220} unmountOnExit>
                {pokemon ? (
                  <Stack spacing={1.6}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 1,
                        width: "100%"
                      }}
                    >
                      <VitalPill
                        label="Height"
                        value={`${formatMeters(pokemon.height)} m`}
                        icon="icons/height.svg"
                        iconAlt="Height icon"
                      />
                      <VitalPill
                        label="Weight"
                        value={`${formatKilograms(pokemon.weight)} kg`}
                        icon="icons/weight.svg"
                        iconAlt="Weight icon"
                      />
                      <VitalPill
                        label="BST"
                        value={String(pokemon.baseStatTotal || 0)}
                        highlighted
                      />
                    </Box>
                    <AbilityTabs abilities={pokemon.abilities} />
                    <StatList stats={pokemon.stats} />
                  </Stack>
                ) : null}
              </Collapse>
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};
