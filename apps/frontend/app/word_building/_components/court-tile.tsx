'use client';
//
// Word Building cell: letter plus correct/wrong/empty status.
// Word Soup has its own court-tile.tsx.

import type { CellStatus, CourtCell } from '@/lib/api/games/word-building.types';

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
  row:           number;
  col:           number;
  isSelected:    boolean;
  isDragTarget?: boolean;
  onClick:       () => void;
  lockedByName?: string;
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
 * @returns A responsive tile that fills its CSS Grid cell with a square aspect ratio.
 */
export function CourtTile({ cell, row, col, isSelected, isDragTarget, onClick, lockedByName }: CourtTileProps) {
  if (cell.status === 'none') {
    return <div className="aspect-square bg-gray-900" />;
  }

  return (
    <div
      onClick={onClick}
      className={[
        'relative aspect-square flex items-center justify-center overflow-hidden',
        'font-bold border cursor-pointer select-none',
        'transition-colors duration-150',
        STATUS_BG[cell.status],
        STATUS_TEXT[cell.status],
        isSelected ? 'ring-2 ring-yellow-400 ring-inset z-10' : '',
        // Orange ring when the ant is hovering — only on cells that can accept a drop
        isDragTarget && !isSelected && cell.status !== 'correct' ? 'ring-2 ring-orange-400 ring-inset z-10 brightness-110' : '',
        lockedByName ? 'ring-2 ring-purple-400 ring-inset' : '',
      ].join(' ')}
      data-word-cell={true}
      data-row={row}
      data-col={col}
    >
      {/* Clue number — small, top-left */}
      {cell.clueNumber !== undefined && (
        <span className="absolute top-0.5 left-0.5 z-20 rounded-[2px] bg-white/80 px-0.5 text-[10px] leading-none text-gray-900 font-semibold pointer-events-none">
          {cell.clueNumber}
        </span>
      )}

      {/* The letter */}
      <span className="text-xs leading-none">{cell.char}</span>

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

