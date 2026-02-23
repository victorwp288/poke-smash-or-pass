import React from "react";
import { cn } from "@/lib/utils";

export const QuickFilterBar = ({
  genCount,
  genTotal,
  typeCount,
  typeTotal,
  dailyDeck,
  shinyMode,
  panelOpen,
  onToggleDailyDeck,
  onToggleShinyMode,
  onOpenFilters
}: {
  genCount: number;
  genTotal: number;
  typeCount: number;
  typeTotal: number;
  dailyDeck: boolean;
  shinyMode: boolean;
  panelOpen: boolean;
  onToggleDailyDeck: () => void;
  onToggleShinyMode: () => void;
  onOpenFilters: () => void;
}) => {
  return (
    <div className="mobile-filterbar" aria-label="Quick filters">
      <div className="filter-summary">
        <span className="filter-title">Quick filters</span>
        <span className="filter-counts">
          {genCount}/{genTotal} gens · {typeCount}/{typeTotal} types
        </span>
      </div>
      <div className="filter-actions">
        <button
          className={cn("pill pill-mini", dailyDeck && "is-on")}
          type="button"
          aria-pressed={dailyDeck}
          onClick={onToggleDailyDeck}
        >
          Daily deck
        </button>
        <button
          className={cn("pill pill-mini", shinyMode && "is-on")}
          type="button"
          aria-pressed={shinyMode}
          onClick={onToggleShinyMode}
        >
          Shiny mode
        </button>
        <button
          className="pill pill-mini"
          type="button"
          aria-controls="filterPanel"
          aria-expanded={panelOpen}
          onClick={onOpenFilters}
        >
          Filters
        </button>
      </div>
    </div>
  );
};

