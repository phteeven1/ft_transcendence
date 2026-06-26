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
  cell:       CourtCell;
  isSelected: boolean;
  onClick:    () => void;
};

/**
 * Renders a single crossword cell, including status coloring, selection state,
 * and the clue-number badge used by the word-building layout.
 *
 * @param cell Cell data from the visible court.
 * @param isSelected Whether this cell is the current keyboard target.
 * @param onClick Callback fired when the cell is clicked.
 * @returns A tile sized for the crossword grid.
 */
export function CourtTile({ cell, isSelected, onClick }: CourtTileProps) {
  if (cell.status === 'none') {
    return <div className="w-8 h-8 bg-gray-900" />;
  }

  return (
    <div
      onClick={onClick}
      className={[
        'relative w-8 h-8 flex items-center justify-center overflow-hidden',
        'text-sm font-bold border cursor-pointer select-none',
        'transition-colors duration-150',
        STATUS_BG[cell.status],
        STATUS_TEXT[cell.status],
        isSelected ? 'ring-2 ring-yellow-400 ring-inset z-10' : '',
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
    </div>
  );
}

export default CourtTile;

