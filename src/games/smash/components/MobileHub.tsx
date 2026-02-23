import React from "react";
import { cn } from "@/lib/utils";
import type { HistoryEntry } from "@/games/smash/smashTypes";

const CollectChip = ({ entry }: { entry: HistoryEntry }) => {
  return (
    <span className="collect-item">
      {entry.thumb ? <img src={entry.thumb} alt={entry.name} /> : null}
      <span>{entry.name}</span>
    </span>
  );
};

export const MobileHub = ({
  hubRef,
  open,
  statusText,
  smashCount,
  passCount,
  undoCount,
  keepHistory,
  favorites,
  smashHistory,
  passHistory,
  onClose,
  onHelp,
  onOpenFilters,
  onPass,
  onSmash,
  onUndo,
  onShuffle
}: {
  hubRef?: React.Ref<HTMLDivElement>;
  open: boolean;
  statusText: string;
  smashCount: number;
  passCount: number;
  undoCount: number;
  keepHistory: boolean;
  favorites: HistoryEntry[];
  smashHistory: HistoryEntry[];
  passHistory: HistoryEntry[];
  onClose: () => void;
  onHelp: () => void;
  onOpenFilters: () => void;
  onPass: () => void;
  onSmash: () => void;
  onUndo: () => void;
  onShuffle: () => void;
}) => {
  const [smashPanelOpen, setSmashPanelOpen] = React.useState(false);
  const [passPanelOpen, setPassPanelOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setSmashPanelOpen(false);
      setPassPanelOpen(false);
    }
  }, [open]);

  const visibleSmashCount = keepHistory ? smashHistory.length : 0;
  const visiblePassCount = keepHistory ? passHistory.length : 0;

  const undoLabel = undoCount ? `Undo (${undoCount})` : "Undo";

  return (
    <div
      ref={hubRef}
      id="mobileHub"
      className={cn("mobile-hub", open && "is-open")}
      aria-hidden={!open}
    >
      <div className="mobile-hub-tools">
        <button className="pill" type="button" onClick={onHelp}>
          Help
        </button>
        <button className="pill" type="button" onClick={onOpenFilters}>
          Filters
        </button>
        <button className="pill" type="button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="mobile-hub-head">
        <div className="status-pill">{statusText}</div>
        <div className="score-pill">Smash {smashCount} - Pass {passCount}</div>
      </div>

      <div className="mobile-hub-actions">
        <button className="action pass" type="button" onClick={onPass}>
          Pass
        </button>
        <button className="action smash" type="button" onClick={onSmash}>
          Smash
        </button>
        <button className="action undo" type="button" onClick={onUndo} disabled={undoCount === 0}>
          {undoLabel}
        </button>
        <button className="action shuffle" type="button" onClick={onShuffle}>
          Shuffle
        </button>
      </div>

      <div className="mobile-hub-history" aria-label="Swipe history">
        <div className="mobile-hub-history-lane">
          <button
            className={cn("mobile-hub-history-head", smashPanelOpen && "is-open")}
            aria-expanded={smashPanelOpen}
            type="button"
            onClick={() => {
              const next = !smashPanelOpen;
              setSmashPanelOpen(next);
              if (next) setPassPanelOpen(false);
            }}
          >
            <span className="mobile-hub-history-title">Smash list</span>
            <span className="mobile-hub-history-count">{visibleSmashCount}</span>
            <span className="mobile-hub-history-chevron" aria-hidden="true" />
          </button>
          <div className="mobile-hub-history-panel" hidden={!smashPanelOpen}>
            <div className="collection wrap mobile-hub-history-list">
              {!keepHistory ? (
                <span className="mobile-hub-history-empty">History off</span>
              ) : smashHistory.length ? (
                smashHistory.map((entry, idx) => (
                  <CollectChip key={`${entry.name}-${idx}`} entry={entry} />
                ))
              ) : (
                <span className="mobile-hub-history-empty">No picks yet</span>
              )}
            </div>
          </div>
        </div>

        <div className="mobile-hub-history-lane">
          <button
            className={cn("mobile-hub-history-head", passPanelOpen && "is-open")}
            aria-expanded={passPanelOpen}
            type="button"
            onClick={() => {
              const next = !passPanelOpen;
              setPassPanelOpen(next);
              if (next) setSmashPanelOpen(false);
            }}
          >
            <span className="mobile-hub-history-title">Pass list</span>
            <span className="mobile-hub-history-count">{visiblePassCount}</span>
            <span className="mobile-hub-history-chevron" aria-hidden="true" />
          </button>
          <div className="mobile-hub-history-panel" hidden={!passPanelOpen}>
            <div className="collection wrap mobile-hub-history-list">
              {!keepHistory ? (
                <span className="mobile-hub-history-empty">History off</span>
              ) : passHistory.length ? (
                passHistory.map((entry, idx) => (
                  <CollectChip key={`${entry.name}-${idx}`} entry={entry} />
                ))
              ) : (
                <span className="mobile-hub-history-empty">No picks yet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mobile-hub-favorites" aria-label="Saved Pokemon">
        <div className="mobile-hub-favorites-head">
          <span>Favorites</span>
          <span className="mobile-favorites-count">{favorites.length}</span>
        </div>
        <div className="collection mobile-hub-favorites-list">
          {favorites.length ? (
            favorites.map((fav, idx) => <CollectChip key={`${fav.name}-${idx}`} entry={fav} />)
          ) : (
            <span className="mobile-favorites-empty">No saved Pokemon yet</span>
          )}
        </div>
      </div>
    </div>
  );
};
