'use client';
//
// Changes from scaffold placeholder:
//   - COURT_ROWS changed from 10 → 18 (crosswords need a square grid)
//   - Renders CourtTile instead of raw char
//   - Passes selectedRow/Col through to CourtTile for yellow selection ring
//   - onCellClick fires with (row, col) so the orchestrator can track selection
//
// Keep COURT_COLS and COURT_ROWS in sync with word-building.service.ts.

import { CourtCell, CourtTile } from './court-tile';

export const COURT_COLS = 18;   // must match word-building.service.ts
export const COURT_ROWS = 18;   // must match word-building.service.ts (was 10)

type GameCourtProps = {
  court:        CourtCell[][];
  selectedRow:  number | null;
  selectedCol:  number | null;
  onCellClick:  (row: number, col: number) => void;
  /** Callback fired when a letter tile from the rack is dropped onto a cell. */
  onCellDrop?:  (row: number, col: number, letter: string) => void;
  /** Active soft locks keyed by "row,col". Used to render the activity indicator. */
  locks?:       Map<string, { playerName: string; playerId: number }>;
  /** Current player's id — prevents showing the indicator for own lock. */
  myPlayerId?:  number;
};

/**
 * Renders the crossword board and forwards cell interactions back to the orchestrator.
 *
 * @param court The current visible crossword grid.
 * @param selectedRow The currently selected row, if any.
 * @param selectedCol The currently selected column, if any.
 * @param onCellClick Callback fired when a playable cell is selected.
 * @param onCellDrop Callback fired when a letter tile is dropped onto a cell.
 * @param locks Active soft locks keyed by "row,col".
 * @param myPlayerId Current player — suppresses own lock indicator.
 */
export function GameCourt({ court, selectedRow, selectedCol, onCellClick, onCellDrop, locks, myPlayerId }: GameCourtProps) {
  if (!court.length) return null;

  const cols = court[0].length;

  return (
    <div
      className="inline-grid gap-px bg-gray-500 border border-gray-500 rounded overflow-hidden"
      style={{ gridTemplateColumns: `repeat(${cols}, 2rem)` }}
    >
      {court.map((row, r) =>
        row.map((cell, c) => {
          const lock = locks?.get(`${r},${c}`);
          const lockedByName = (lock && lock.playerId !== myPlayerId) ? lock.playerName : undefined;
          return (
            <CourtTile
              key={`${r}-${c}`}
              cell={cell}
              isSelected={r === selectedRow && c === selectedCol}
              onClick={() => onCellClick(r, c)}
              lockedByName={lockedByName}
              onTileDrop={onCellDrop ? (letter) => onCellDrop(r, c, letter) : undefined}
            />
          );
        }),
      )}
    </div>
  );
}

export default GameCourt;
