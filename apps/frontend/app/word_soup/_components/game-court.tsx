'use client';

/*
  Renders the game court as a fluid square grid.
  The board fills its column width (capped by the parent). Cells use
  aspect-square so the court stays square — same model as Word Building.

  Grid dimensions live in word-soup-constants.ts and must stay in sync
  with the backend.
*/

import type { PointerEvent as ReactPointerEvent, ReactNode, TouchEvent as ReactTouchEvent } from 'react';
import CourtTile from './court-tile';
import type { WordSoupCourtCell } from '@/lib/api/games/word-soup/types';
import type { WordCelebration } from '@/app/hooks/word-soup/use-word-soup-celebration';
import { COURT_TILE_GAP } from '../_lib/word-soup-constants';

interface Props {
  visibleCourt: WordSoupCourtCell[][];
  playerColours: Record<number, string>;
  selectedCells: Array<{ row: number; col: number }>;
  foundWordGroups: Array<{ playerId: number; cells: Array<{ row: number; col: number }> }>;
  isLocalPlayerFrozen: boolean;
  freezeSecondsLeft: number;
  lettersVisible?: boolean;
  wordCelebration: WordCelebration | null;
  overlay?: ReactNode;
  onSelectionStart: (row: number, col: number) => void;
  onSelectionContinue: (row: number, col: number) => void;
  onSelectionEnd: () => void;
}

function continueFromPoint(
  clientX: number,
  clientY: number,
  onSelectionContinue: (row: number, col: number) => void,
) {
  const el = document.elementFromPoint(clientX, clientY);
  const tile = el?.closest<HTMLElement>('[data-court-tile]');
  if (!tile) return;
  const row = Number(tile.dataset.row);
  const col = Number(tile.dataset.col);
  if (Number.isInteger(row) && Number.isInteger(col)) {
    onSelectionContinue(row, col);
  }
}

export default function GameCourt({
  visibleCourt,
  playerColours,
  selectedCells,
  foundWordGroups,
  isLocalPlayerFrozen,
  freezeSecondsLeft,
  lettersVisible = true,
  wordCelebration,
  overlay = null,
  onSelectionStart,
  onSelectionContinue,
  onSelectionEnd,
}: Props) {
  const getCelebrationHighlight = (
    row: number,
    col: number,
  ): { playerId: number; status: 'filled' | 'leading' } | undefined => {
    if (!wordCelebration) return undefined;

    const index = wordCelebration.orderedCells.findIndex(
      (cell) => cell.row === row && cell.col === col,
    );
    if (index === -1) return undefined;
    if (index > wordCelebration.activeIndex) return undefined;

    return {
      playerId: wordCelebration.playerId,
      status: index === wordCelebration.activeIndex ? 'leading' : 'filled',
    };
  };

  const interactionDisabled =
    !lettersVisible ||
    isLocalPlayerFrozen ||
    wordCelebration !== null;

  const handleTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
    if (interactionDisabled) return;
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    continueFromPoint(touch.clientX, touch.clientY, onSelectionContinue);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Mouse uses tile mouseEnter; this path covers touch/pen after court capture.
    if (interactionDisabled) return;
    if (event.pointerType === 'mouse') return;
    if (event.buttons === 0) return;
    continueFromPoint(event.clientX, event.clientY, onSelectionContinue);
  };

  if (!visibleCourt.length) return null;

  const cols = visibleCourt[0].length;

  return (
    <div
      className={[
        'relative w-full @container rounded-2xl bg-white shadow-xl transition-[filter,transform] duration-300',
        isLocalPlayerFrozen ? 'word-soup-court-frozen' : '',
      ].join(' ')}
      onMouseUp={interactionDisabled ? undefined : onSelectionEnd}
      onMouseLeave={interactionDisabled ? undefined : onSelectionEnd}
      onTouchEnd={interactionDisabled ? undefined : onSelectionEnd}
      onTouchCancel={interactionDisabled ? undefined : onSelectionEnd}
      onTouchMove={interactionDisabled ? undefined : handleTouchMove}
      onPointerMove={interactionDisabled ? undefined : handlePointerMove}
      style={{
        touchAction: 'none',
      }}
    >
      <div
        className={interactionDisabled ? 'pointer-events-none select-none grid p-1' : 'grid p-1'}
        style={{
          gap: `${COURT_TILE_GAP}px`,
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {visibleCourt.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const celebrationHighlight = getCelebrationHighlight(rowIndex, colIndex);

            return (
              <CourtTile
                key={`${rowIndex}-${colIndex}`}
                cell={cell}
                row={rowIndex}
                col={colIndex}
                playerColours={playerColours}
                foundWordGroups={foundWordGroups}
                isSelected={selectedCells.some(
                  (selected) => selected.row === rowIndex && selected.col === colIndex,
                )}
                hideLetter={!lettersVisible}
                celebrationHighlight={celebrationHighlight}
                onSelectionStart={onSelectionStart}
                onSelectionContinue={onSelectionContinue}
              />
            );
          }),
        )}
      </div>

      {isLocalPlayerFrozen && (
        <div
          className="word-soup-freeze-overlay pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
          role="status"
          aria-live="assertive"
        >
          <div className="word-soup-freeze-card mx-4 max-w-[260px] rounded-2xl border-4 border-sky-200 bg-white/95 px-5 py-4 text-center shadow-lg">
            <div className="word-soup-freeze-snowflakes mb-2 text-3xl" aria-hidden="true">
              <span>🧊</span>
              <span>❄️</span>
              <span>🐧</span>
            </div>
            <p className="text-lg font-extrabold text-sky-700"> Incorrect guess!</p>
            <p className="mt-1 text-sm font-semibold text-sky-900">
              BRRR! You&apos;re Frozen! Chill for a bit!
            </p>
            <p className="mt-3 text-4xl font-black tabular-nums text-sky-600">
              {freezeSecondsLeft}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-500">
              seconds left
            </p>
          </div>
        </div>
      )}

      {overlay}
    </div>
  );
}
