import React from "react";
import { TYPE_COLORS, TYPE_ICON_FILES } from "@/lib/constants";
import { TYPE_LIST, type PokemonTypeName } from "@/lib/typeChart";
import { capitalize } from "@/lib/text";
import { cn } from "@/lib/utils";
import type { HistoryEntry, SmashFiltersStorage, SmashHistoryStorage, SmashOptionsStorage } from "@/games/smash/smashTypes";

const GEN_COUNT = 9;
const DESKTOP_HISTORY_LIMIT = 12;

const getTypeIconUrl = (type: PokemonTypeName) => {
  const file = TYPE_ICON_FILES[type];
  if (!file) return "";
  return `icons/types/${file}`;
};

const CollectChip = ({ entry }: { entry: HistoryEntry }) => {
  return (
    <span className="collect-item">
      {entry.thumb ? <img src={entry.thumb} alt={entry.name} /> : null}
      <span>{entry.name}</span>
    </span>
  );
};

export const FiltersPanel = ({
  open,
  filters,
  options,
  history,
  favorites,
  badges,
  onClose,
  onToggleGen,
  onSetAllGens,
  onClearGens,
  onToggleType,
  onSetAllTypes,
  onClearTypes,
  onChangeOption,
  onClearHistory,
  onExportJson,
  onExportCsv,
  onShareCard
}: {
  open: boolean;
  filters: SmashFiltersStorage;
  options: SmashOptionsStorage;
  history: SmashHistoryStorage;
  favorites: HistoryEntry[];
  badges: string[];
  onClose: () => void;
  onToggleGen: (genId: number) => void;
  onSetAllGens: () => void;
  onClearGens: () => void;
  onToggleType: (type: PokemonTypeName) => void;
  onSetAllTypes: () => void;
  onClearTypes: () => void;
  onChangeOption: <K extends keyof SmashOptionsStorage>(key: K, value: SmashOptionsStorage[K]) => void;
  onClearHistory: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onShareCard: () => void;
}) => {
  const selectedGens = new Set(filters.gens);
  const selectedTypes = new Set(filters.types);

  const smashList = options.keepHistory ? history.smash.slice(-DESKTOP_HISTORY_LIMIT) : [];
  const passList = options.keepHistory ? history.pass.slice(-DESKTOP_HISTORY_LIMIT) : [];

  return (
    <aside className={cn("panel", open && "is-open")} id="filterPanel">
      <div className="panel-header">
        <h2>Filters</h2>
        <button className="pill panel-close" type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="panel-block" id="genFilterBlock">
        <h2>Generation filters</h2>
        <div className="gen-grid" id="genGrid">
          {Array.from({ length: GEN_COUNT }, (_, i) => i + 1).map((genId) => (
            <label key={genId} className="gen-option">
              <input
                type="checkbox"
                value={String(genId)}
                checked={selectedGens.has(genId)}
                onChange={() => onToggleGen(genId)}
              />
              <span>Gen {genId}</span>
            </label>
          ))}
        </div>
        <div className="panel-actions">
          <button className="ghost" type="button" onClick={onSetAllGens}>
            Select all
          </button>
          <button className="ghost" type="button" onClick={onClearGens}>
            Clear
          </button>
        </div>
      </div>

      <div className="panel-block" id="typeFilterBlock">
        <h2>Type filters</h2>
        <div className="type-grid" id="typeGrid">
          {TYPE_LIST.map((type) => (
            <label
              key={type}
              className="type-option"
              style={{
                background: `color-mix(in srgb, ${TYPE_COLORS[type] ?? "#eee"} 35%, white)`
              }}
            >
              <input
                type="checkbox"
                value={type}
                checked={selectedTypes.has(type)}
                onChange={() => onToggleType(type)}
              />
              <span className="type-option-icon">
                <img
                  className="type-option-icon-img"
                  src={getTypeIconUrl(type)}
                  alt={`${capitalize(type)} type icon`}
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    event.currentTarget.parentElement?.classList.add("is-missing");
                    event.currentTarget.remove();
                  }}
                />
              </span>
              <span className="type-option-label">{capitalize(type)}</span>
            </label>
          ))}
        </div>
        <div className="panel-actions">
          <button className="ghost" type="button" onClick={onSetAllTypes}>
            All types
          </button>
          <button className="ghost" type="button" onClick={onClearTypes}>
            Clear
          </button>
        </div>
      </div>

      <div className="panel-block" id="deckOptionsBlock">
        <h2>Deck options</h2>
        <label className="toggle">
          <input
            type="checkbox"
            checked={options.autoReveal}
            onChange={(event) => onChangeOption("autoReveal", event.target.checked)}
          />
          <span>Auto-reveal stats</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={options.shinyMode}
            onChange={(event) => onChangeOption("shinyMode", event.target.checked)}
          />
          <span>Shiny mode</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={options.dailyDeck}
            onChange={(event) => onChangeOption("dailyDeck", event.target.checked)}
          />
          <span>Daily deck (20)</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={options.onlyMega}
            onChange={(event) => onChangeOption("onlyMega", event.target.checked)}
          />
          <span>Only Mega-capable</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={options.keepHistory}
            onChange={(event) => onChangeOption("keepHistory", event.target.checked)}
          />
          <span>Keep history</span>
        </label>
      </div>

      <div className="panel-block">
        <h2>Badges</h2>
        <div className="collection wrap" id="badgeList">
          {badges.map((badge) => (
            <span key={badge} className="badge-chip">
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div className="panel-block">
        <h2>Favorites</h2>
        <div className="collection wrap" id="favoriteList">
          {favorites.map((fav) => (
            <CollectChip key={fav.name} entry={fav} />
          ))}
        </div>
        <div className="panel-actions">
          <button className="ghost" type="button" onClick={onExportJson} disabled={!favorites.length}>
            Export JSON
          </button>
          <button className="ghost" type="button" onClick={onExportCsv} disabled={!favorites.length}>
            Export CSV
          </button>
          <button
            className="ghost"
            type="button"
            onClick={onShareCard}
            disabled={!favorites.length && !history.smash.length}
          >
            Share card
          </button>
        </div>
      </div>

      <div className="panel-block history-panel-block">
        <h2>Smash list</h2>
        <div className="collection" id="smashList">
          {smashList.map((entry, idx) => (
            <CollectChip key={`${entry.name}-${idx}`} entry={entry} />
          ))}
        </div>
      </div>

      <div className="panel-block history-panel-block">
        <h2>Pass list</h2>
        <div className="collection" id="passList">
          {passList.map((entry, idx) => (
            <CollectChip key={`${entry.name}-${idx}`} entry={entry} />
          ))}
        </div>
        <div className="panel-actions">
          <button className="ghost" type="button" onClick={onClearHistory}>
            Clear history
          </button>
        </div>
      </div>
    </aside>
  );
};
