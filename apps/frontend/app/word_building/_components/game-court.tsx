'use client';
//
// Crossword grid — renders CourtTile for each cell and forwards clicks.
// Board dimensions are determined by the court prop (derived from the backend
// API response). See word-building.config.ts for the authoritative config.

import { CourtCell, CourtTile } from './court-tile';

type GameCourtProps = {
  court:           CourtCell[][];
  selectedRow:     number | null;
  selectedCol:     number | null;
  onCellClick:     (row: number, col: number) => void;
  locks?:          Map<string, { playerName: string; playerId: number }>;
  myPlayerId?:     number;
  /** Row of the cell currently targeted by an in-flight tile drag, or null. */
  dragTargetRow?:  number | null;
  /** Column of the cell currently targeted by an in-flight tile drag, or null. */
  dragTargetCol?:  number | null;
};

/**
 * Renders the crossword board and forwards cell interactions back to the orchestrator.
 *
 * @param court The current visible crossword grid.
 * @param selectedRow The currently selected row, if any.
 * @param selectedCol The currently selected column, if any.
 * @param onCellClick Callback fired when a playable cell is selected.
 * @param locks Active soft locks keyed by "row,col".
 * @param myPlayerId Current player — suppresses own lock indicator.
 */
export function GameCourt({ court, selectedRow, selectedCol, onCellClick, locks, myPlayerId, dragTargetRow, dragTargetCol }: GameCourtProps) {
  if (!court.length) return null;

  const cols = court[0].length;

  return (
    <div
      className="w-full grid gap-px bg-gray-500 border border-gray-500 rounded overflow-hidden"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {court.map((row, r) =>
        row.map((cell, c) => {
          const lock = locks?.get(`${r},${c}`);
          const lockedByName = (lock && lock.playerId !== myPlayerId) ? lock.playerName : undefined;
          return (
            <CourtTile
              key={`${r}-${c}`}
              cell={cell}
              row={r}
              col={c}
              isSelected={r === selectedRow && c === selectedCol}
              isDragTarget={r === dragTargetRow && c === dragTargetCol}
              onClick={() => onCellClick(r, c)}
              lockedByName={lockedByName}
            />
          );
        }),
      )}
    </div>
  );
}

export default GameCourt;
