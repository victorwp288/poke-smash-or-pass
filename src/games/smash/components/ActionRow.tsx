import React from "react";

export const ActionRow = ({
  disabled,
  isShuffling,
  undoCount,
  onPass,
  onSmash,
  onUndo,
  onShuffle
}: {
  disabled: boolean;
  isShuffling: boolean;
  undoCount: number;
  onPass: () => void;
  onSmash: () => void;
  onUndo: () => void;
  onShuffle: () => void;
}) => {
  const undoLabel = undoCount ? `Undo (${undoCount})` : "Undo";

  return (
    <div className="actions">
      <button className="action pass" type="button" onClick={onPass} disabled={disabled}>
        Pass
      </button>
      <button
        className="action undo"
        type="button"
        onClick={onUndo}
        disabled={disabled || undoCount === 0}
      >
        {undoLabel}
      </button>
      <button
        className="action shuffle"
        type="button"
        onClick={onShuffle}
        disabled={disabled || isShuffling}
      >
        {isShuffling ? "Shuffling…" : "Shuffle"}
      </button>
      <button className="action smash" type="button" onClick={onSmash} disabled={disabled}>
        Smash
      </button>
    </div>
  );
};

