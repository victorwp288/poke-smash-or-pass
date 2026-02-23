import React from "react";
import type { Pokemon } from "@/lib/pokeapi/types";
import { TYPE_COLORS, TYPE_ICON_FILES, CATEGORY_LABELS } from "@/lib/constants";
import type { PokemonTypeName } from "@/lib/typeChart";
import { capitalize, formatId, normalizeInlineText } from "@/lib/text";
import { getSpriteScale } from "@/games/smash/smashLogic";
import { parseStoneMethodLabel, splitEvolutionEntryVariants } from "@/lib/pokeapi/evolution";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const StatVitals = ({ pokemon }: { pokemon: Pokemon }) => {
  const vitals = [
    {
      label: "Height",
      value: `${formatMeters(pokemon.height)} m`,
      icon: "icons/height.svg",
      iconAlt: "Height icon"
    },
    {
      label: "Weight",
      value: `${formatKilograms(pokemon.weight)} kg`,
      icon: "icons/weight.svg",
      iconAlt: "Weight icon"
    },
    {
      label: "BST",
      value: String(pokemon.baseStatTotal || 0),
      icon: "",
      iconAlt: ""
    }
  ];

  return (
    <div className="stat-vitals">
      {vitals.map((item) => (
        <span key={item.label} className="vital-item">
          {item.icon ? (
            <img
              className="vital-icon"
              src={item.icon}
              alt={item.iconAlt}
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <span className="vital-key">{item.label}</span>
          <span className="vital-value">{item.value}</span>
        </span>
      ))}
    </div>
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
    <div className="abilities-block">
      <span className="abilities-title">Abilities</span>
      <div className="abilities-list" role="tablist" aria-label="Pokemon abilities">
        {sorted.map((ability, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={`${ability.name}-${index}`}
              type="button"
              className={cn("ability-chip", isActive && "is-active")}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveIndex(index)}
            >
              <span className="ability-name">{capitalize(ability.name)}</span>
              {ability.isHidden ? (
                <span className="ability-hidden">Hidden</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="ability-panels">
        {sorted.map((ability, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={`${ability.name}-panel-${index}`}
              className={cn("ability-panel", isActive && "is-active")}
              hidden={!isActive}
              role="tabpanel"
            >
              {normalizeInlineText(ability.description || "No description available yet.")}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StatList = ({ stats }: { stats: Pokemon["stats"] }) => {
  const total = (stats || []).reduce(
    (sum, stat) => sum + (Number(stat?.base_stat) || 0),
    0
  );
  return (
    <>
      {(stats || []).map((stat) => (
        <div key={stat.stat.name} className="stat">
          <span>{capitalize(stat.stat.name)}</span>
          <span>{stat.base_stat}</span>
        </div>
      ))}
      <div className="stat stat-total">
        <span>Total</span>
        <span>{total}</span>
      </div>
    </>
  );
};

const EvolutionLine = ({ pokemon }: { pokemon: Pokemon }) => {
  const stages = pokemon.evolution;
  if (!Array.isArray(stages) || stages.length === 0) return null;
  const totalEntries = stages.reduce((sum, stage) => sum + (stage?.length || 0), 0);
  if (totalEntries <= 1) return null;

  return (
    <div className="evolution">
      <div className="evo-flow">
        {stages.map((stage, stageIndex) => (
          <React.Fragment key={`stage-${stageIndex}`}>
            <div className={cn("evo-stage", stage.length > 1 && "is-branch")}>
              {stage.flatMap((entry) =>
                splitEvolutionEntryVariants(entry).map((variant) => {
                  const isVariantLabel = variant.label !== entry.label;
                  const isCurrent =
                    entry.name === pokemon.rawName && !isVariantLabel;
                  return (
                    <div
                      key={`${entry.name}-${variant.label}-${stageIndex}`}
                      className="evo-branch"
                    >
                      <span className={cn("evo-node", isCurrent && "is-current")}>
                        <img
                          className={cn("evo-sprite", !entry.sprite && "is-missing")}
                          alt={`${variant.label} sprite`}
                          loading="lazy"
                          decoding="async"
                          src={entry.sprite || undefined}
                          onError={(event) => {
                            (event.currentTarget as HTMLImageElement).classList.add(
                              "is-missing"
                            );
                          }}
                        />
                        <span className="evo-name">{variant.label}</span>
                      </span>

                      {entry.isLaterGenEvolution && entry.generation ? (
                        <span className="evo-gen-badge">Gen {entry.generation}</span>
                      ) : null}

                      {variant.methodLabels.length ? (
                        <div className="evo-methods">
                          {variant.methodLabels.map((methodLabel) => {
                            const stoneMethod = parseStoneMethodLabel(methodLabel);
                            if (stoneMethod) {
                              return (
                                <span
                                  key={`${entry.name}-${methodLabel}`}
                                  className="evo-method evo-method-stone"
                                >
                                  <img
                                    className="evo-method-stone-icon"
                                    src={stoneMethod.sprite}
                                    alt={`${stoneMethod.label} icon`}
                                    loading="lazy"
                                    decoding="async"
                                    onError={(event) => {
                                      (event.currentTarget as HTMLImageElement).classList.add(
                                        "is-missing"
                                      );
                                    }}
                                  />
                                  <span className="evo-method-stone-name">
                                    {stoneMethod.label}
                                  </span>
                                  {stoneMethod.extraLabel ? (
                                    <span className="evo-method-stone-extra">
                                      · {stoneMethod.extraLabel}
                                    </span>
                                  ) : null}
                                </span>
                              );
                            }
                            return (
                              <span key={`${entry.name}-${methodLabel}`} className="evo-method">
                                {methodLabel}
                              </span>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
            {stageIndex < stages.length - 1 ? (
              <span className="evo-arrow">→</span>
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const TypeBadges = ({ pokemon }: { pokemon: Pokemon }) => {
  return (
    <div className="types">
      {pokemon.types.map((type) => {
        const typeName = type.type.name;
        return (
          <span
            key={typeName}
            className="type"
            style={{ background: TYPE_COLORS[typeName] || "#f0f0f0" }}
          >
            <span className="type-chip-icon">
              <img
                className="type-chip-icon-img"
                src={getTypeIconUrl(typeName)}
                alt={`${capitalize(typeName)} type icon`}
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  (event.currentTarget.parentElement as HTMLElement)?.classList.add(
                    "is-missing"
                  );
                  event.currentTarget.remove();
                }}
              />
            </span>
            <span>{typeName}</span>
          </span>
        );
      })}
      {pokemon.canMegaEvolve ? (
        <span className="type-mega" aria-label="Can Mega Evolve" title="Can Mega Evolve">
          <span className="mega-icon" aria-hidden="true">
            <img src="icons/megaevolution.webp" alt="" loading="lazy" decoding="async" />
          </span>
        </span>
      ) : null}
      {pokemon.categoryTags.map((tag, index) => {
        const label = CATEGORY_LABELS[tag];
        if (!label) return null;
        return (
          <span
            key={`${tag}-${index}`}
            className={cn(
              "category-chip",
              `category-${tag}`,
              index === 0 && "category-chip-meta"
            )}
          >
            {label}
          </span>
        );
      })}
    </div>
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

  const onImagePointerDown: React.PointerEventHandler<HTMLImageElement> = (event) => {
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

  const onImagePointerMove: React.PointerEventHandler<HTMLImageElement> = (event) => {
    if (!imageSwipeRef.current.active) return;
    const deltaX = event.clientX - imageSwipeRef.current.startX;
    const deltaY = event.clientY - imageSwipeRef.current.startY;
    if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
      setSuppressImageClick(true);
    }
    event.stopPropagation();
  };

  const onImagePointerUp: React.PointerEventHandler<HTMLImageElement> = (event) => {
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

  const cardTransform = transform || "";

  return (
    <div className={cn("card-shell", cardShellClassName)}>
      <div
        className={cn("card", isDragging && "dragging", swipeStatus === "pass" && "swipe-left", swipeStatus === "smash" && "swipe-right", showStats && "show-stats")}
        data-status={swipeStatus}
        style={{ transform: cardTransform || undefined }}
        {...pointerHandlers}
      >
        <div className="stamp stamp-smash">SMASH</div>
        <div className="stamp stamp-pass">PASS</div>

        <button
          className={cn("favorite-fab", isFavorite && "is-saved")}
          aria-label={isFavorite ? "Remove from saved Pokemon" : "Save Pokemon"}
          aria-pressed={isFavorite}
          onClick={onToggleFavorite}
          type="button"
        >
          <svg className="heart-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" />
          </svg>
        </button>

        <button
          className={cn("cry-fab", cryPlaying && "is-playing", cryDisabled && "is-disabled")}
          aria-label={cryDisabled ? "No cry available for this Pokemon" : "Play Pokemon cry"}
          title={cryDisabled ? "No cry available" : "Play cry"}
          disabled={cryDisabled}
          onClick={onPlayCry}
          type="button"
        />

        <div className="media">
          <img
            alt={pokemon ? `${pokemon.name} artwork` : "Pokemon artwork"}
            id={undefined}
            src={currentImage || baseImage || undefined}
            onClick={handleMainImageClick}
            onPointerDown={onImagePointerDown}
            onPointerMove={onImagePointerMove}
            onPointerUp={onImagePointerUp}
            onPointerCancel={onImagePointerUp}
          />
          <div className="media-glow" />
        </div>

        <div className="thumbs">
          {gallery.map((url) => (
            <button
              key={url}
              className={cn("thumb", url === currentImage && "active")}
              type="button"
              onClick={() => onSelectImage(url)}
            >
              <img src={url} alt="Pokemon alternate" />
            </button>
          ))}
        </div>

        <div className="card-body">
          <div className="title-row">
            <div>
              <h1>{pokemon?.name || emptyTitle || "Loading…"}</h1>
              <div className="subtitle-row">
                <div className="subtitle">{pokemon ? formatId(pokemon.id) : "#0000"}</div>
              </div>
            </div>
            <div className="card-actions">
              <Button
                type="button"
                variant="secondary"
                className="pill peek-toggle"
                onClick={onToggleStats}
              >
                {showStats ? "Hide stats" : "Peek stats"}
              </Button>
            </div>
          </div>

          {pokemon ? <TypeBadges pokemon={pokemon} /> : <div className="types" />}
          <p className="bio">{pokemon?.bio || emptyBody || ""}</p>
          {pokemon ? <EvolutionLine pokemon={pokemon} /> : null}
          {pokemon ? (
            <div className="stats">
              <StatVitals pokemon={pokemon} />
              <AbilityTabs abilities={pokemon.abilities} />
              <StatList stats={pokemon.stats} />
            </div>
          ) : (
            <div className="stats" />
          )}
        </div>
      </div>
      <div className="card-shadow" />
    </div>
  );
};
