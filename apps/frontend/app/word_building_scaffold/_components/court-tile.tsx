'use client';
//
// Extends the minimal scaffold CourtCell with status info for word building.
// word_soup uses its own copy of court-tile.tsx with its own CourtCell — no conflict.

export type CellStatus = 'correct' | 'wrong' | 'empty' | 'none';

export type CourtCell = {
  char:         string;
  status:       CellStatus;
  clueNumber?:  number;    // rendered in the top-left corner of word-start cells
  placedBy?:    number;    // playerId of first correct placer
};

// ─── Colour map ───────────────────────────────────────────────────────────────

const STATUS_BG: Record<CellStatus, string> = {
  correct: 'bg-green-400 border-green-600',
  wrong:   'bg-red-400   border-red-600',
  empty:   'bg-blue-100  border-blue-400',
  none:    'bg-gray-900  border-transparent',
};

const STATUS_TEXT: Record<CellStatus, string> = {
  correct: 'text-white',
  wrong:   'text-white',
  empty:   'text-transparent',
  none:    '',
};

// ─── Component ────────────────────────────────────────────────────────────────

type CourtTileProps = {
  cell:          CourtCell;
  isSelected:    boolean;
  onClick:       () => void;
  /** Name of another player who has reserved this cell (shown as overlay). Absent for own lock. */
  lockedByName?: string;
  /** Called when a letter tile from the rack is dropped onto this cell. */
  onTileDrop?:   (letter: string) => void;
};

/**
 * Renders a single crossword cell, including status coloring, selection state,
 * the clue-number badge, a drag-and-drop drop zone, and the live "player is
 * editing" indicator used for multiplayer conflict visibility.
 *
 * @param cell Cell data from the visible court.
 * @param isSelected Whether this cell is the current keyboard target.
 * @param onClick Callback fired when the cell is clicked.
 * @param lockedByName Display name of the player currently editing this cell (others only).
 * @param onTileDrop Callback invoked when a letter tile from the rack is dropped here.
 * @returns A tile sized for the crossword grid.
 */
export function CourtTile({ cell, isSelected, onClick, lockedByName, onTileDrop }: CourtTileProps) {
  if (cell.status === 'none') {
    return <div className="w-8 h-8 bg-gray-900" />;
  }

  const isDroppable = cell.status === 'empty' || cell.status === 'wrong';

  const handleDragOver = (e: React.DragEvent) => {
    if (isDroppable) e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isDroppable || !onTileDrop) return;
    e.preventDefault();
    const letter = e.dataTransfer.getData('text/plain');
    if (letter) onTileDrop(letter);
  };

  return (
    <div
      onClick={onClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={[
        'relative w-8 h-8 flex items-center justify-center overflow-hidden',
        'text-sm font-bold border cursor-pointer select-none',
        'transition-colors duration-150',
        STATUS_BG[cell.status],
        STATUS_TEXT[cell.status],
        isSelected ? 'ring-2 ring-yellow-400 ring-inset z-10' : '',
        lockedByName ? 'ring-2 ring-purple-400 ring-inset' : '',
      ].join(' ')}
    >
      {/* Clue number — small, top-left */}
      {cell.clueNumber !== undefined && (
        <span className="absolute top-0.5 left-0.5 z-20 rounded-[2px] bg-white/80 px-0.5 text-[10px] leading-none text-gray-900 font-semibold pointer-events-none">
          {cell.clueNumber}
        </span>
      )}

      {/* The letter */}
      <span className="mt-1.5 text-[0.9rem] leading-none">{cell.char}</span>

      {/* Live activity indicator — shown only when another player holds the lock */}
      {lockedByName && (
        <span className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none truncate bg-purple-500/85 px-0.5 py-px text-[7px] leading-tight text-white text-center rounded-b">
          {lockedByName}
        </span>
      )}
    </div>
  );
}

export default CourtTile;

