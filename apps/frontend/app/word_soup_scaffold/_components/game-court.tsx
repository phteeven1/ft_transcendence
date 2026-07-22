'use client';

/*
  Renders the S/M/L size selector and the fixed-pixel game court grid.
  Size is local state: set once at mount based on screen width, then only
  changed by the player clicking S/M/L. Rotation and resize do not affect it.
  Each player has their own size — it is not shared via WebSocket.

  Grid dimensions are controlled by two constants at the top of this file:
  COURT_COLS and COURT_ROWS. Change these to resize the grid for this game.
  The matching constants in word-soup-game.tsx and word-soup.service.ts must be kept in sync.
*/

import { useEffect, useState } from 'react';
import CourtTile from './court-tile';
import type { CourtCell } from './court-tile';
import type { WordCelebration } from '@/app/hooks/word-soup/use-word-soup-celebration';

// ── Grid dimensions ──────────────────────────────────────────────────────────
const COURT_COLS = 18;
const COURT_ROWS = 10;
// ─────────────────────────────────────────────────────────────────────────────

const COURT_TILE_GAP = 4;

type CourtSize = 'S' | 'M' | 'L';

const SIZE_CONFIG: Record<CourtSize, { tileSize: number; padding: number; fontSize: number }> = {
  S: { tileSize: 20, padding: 2, fontSize: 16 },
  M: { tileSize: 32, padding: 3, fontSize: 16 },
  L: { tileSize: 46, padding: 4, fontSize: 22 },
};

function computeGridWidth(size: CourtSize): number {
  const { tileSize, padding } = SIZE_CONFIG[size];
  return COURT_COLS * tileSize + (COURT_COLS - 1) * COURT_TILE_GAP + padding * 2;
}

function computeGridHeight(size: CourtSize): number {
  const { tileSize, padding } = SIZE_CONFIG[size];
  return COURT_ROWS * tileSize + (COURT_ROWS - 1) * COURT_TILE_GAP + padding * 2;
}

// Detect default size once at mount. Below lg breakpoint (1024px) → S, else → L.
function getDefaultSize(): CourtSize {
  if (typeof window === 'undefined') return 'L';
  return window.innerWidth < 1024 ? 'M' : 'L';
}

interface Props {
  visibleCourt: CourtCell[][];
  playerColours: Record<number, string>;
  selectedCells: Array<{ row: number; col: number }>;
  foundWordGroups: Array<{ playerId: number; cells: Array<{ row: number; col: number }> }>;
  isLocalPlayerFrozen: boolean;
  freezeSecondsLeft: number;
  wordCelebration: WordCelebration | null;
  onSelectionStart: (row: number, col: number) => void;
  onSelectionContinue: (row: number, col: number) => void;
  onSelectionEnd: () => void;
}

export default function GameCourt({
  visibleCourt,
  playerColours,
  selectedCells,
  foundWordGroups,
  isLocalPlayerFrozen,
  freezeSecondsLeft,
  wordCelebration,
  onSelectionStart,
  onSelectionContinue,
  onSelectionEnd,
}: Props) {
  const [courtSize, setCourtSize] = useState<CourtSize>(() => getDefaultSize());

  // Set the default once on mount — never again automatically.
  useEffect(() => {
    setCourtSize(getDefaultSize());
  }, []);

  const { tileSize, padding, fontSize } = SIZE_CONFIG[courtSize];
  const gridWidth = computeGridWidth(courtSize);
  const gridHeight = computeGridHeight(courtSize);

  const getCelebrationHighlight = (
    row: number,
    col: number,
  ): { playerId: number; status: 'filled' | 'leading' } | undefined => {
    if (!wordCelebration || wordCelebration.phase !== 'animating') return undefined;

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
    isLocalPlayerFrozen || wordCelebration?.phase === 'animating' || wordCelebration?.phase === 'banner';

  return (
    <div className="flex flex-col gap-2">
      {/* Size selector */}
      <div className="flex gap-2">
        {(['S', 'M', 'L'] as CourtSize[]).map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => setCourtSize(size)}
            className={[
              'h-8 w-8 rounded text-sm font-bold transition-colors',
              courtSize === size
                ? 'bg-emerald-500 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
            ].join(' ')}
          >
            {size}
          </button>
        ))}
      </div>

      {/* Court grid — fixed pixel size, scrolls if it doesn't fit */}
      <div
        className={[
          'relative rounded-2xl bg-white shadow-xl transition-[filter,transform] duration-300',
          isLocalPlayerFrozen ? 'word-soup-court-frozen' : '',
        ].join(' ')}
        onMouseUp={interactionDisabled ? undefined : onSelectionEnd}
        onMouseLeave={interactionDisabled ? undefined : onSelectionEnd}
        style={{
          width: `${gridWidth}px`,
          minWidth: `${gridWidth}px`,
          height: `${gridHeight}px`,
          flexShrink: 0,
        }}
      >
        <div
          className={interactionDisabled ? 'pointer-events-none select-none grid' : 'grid'}
          style={{
            padding: `${padding}px`,
            gap: `${COURT_TILE_GAP}px`,
            gridTemplateColumns: `repeat(${COURT_COLS}, ${tileSize}px)`,
            gridTemplateRows: `repeat(${COURT_ROWS}, ${tileSize}px)`,
            gridAutoFlow: 'row',
          }}
        >
          {visibleCourt.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const celebrationHighlight = getCelebrationHighlight(rowIndex, colIndex);
              const isLeading = celebrationHighlight?.status === 'leading';

              return (
                <CourtTile
                  key={
                    isLeading
                      ? `${rowIndex}-${colIndex}-ripple-${wordCelebration?.activeIndex}`
                      : `${rowIndex}-${colIndex}`
                  }
                  cell={cell}
                  row={rowIndex}
                  col={colIndex}
                  tileSize={tileSize}
                  fontSize={fontSize}
                  playerColours={playerColours}
                  foundWordGroups={foundWordGroups}
                  isSelected={selectedCells.some(
                    (selected) => selected.row === rowIndex && selected.col === colIndex,
                  )}
                  celebrationHighlight={celebrationHighlight}
                  onSelectionStart={onSelectionStart}
                  onSelectionContinue={onSelectionContinue}
                />
              );
            }),
          )}
        </div>

        {wordCelebration?.phase === 'banner' && (
          <div className="word-soup-found-banner pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl">
            <div className="mx-4 max-w-sm rounded-2xl border-4 border-emerald-300 bg-white/95 px-6 py-5 text-center shadow-2xl">
              <p className="text-3xl" aria-hidden="true">🎉</p>
              <p className="mt-2 text-lg font-extrabold text-emerald-800">
                {wordCelebration.playerName} found
              </p>
              <p className="mt-1 text-2xl font-black tracking-wide text-emerald-900">
                {wordCelebration.word}
              </p>
              <p className="mt-2 text-sm font-semibold text-emerald-700">
                +{wordCelebration.points} points
              </p>
            </div>
          </div>
        )}

        {wordCelebration?.phase === 'final-word' && (
          <div className="word-soup-final-word-banner pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
            <div className="rounded-full border-2 border-amber-400 bg-amber-50 px-5 py-2 text-center shadow-lg">
              <p className="text-sm font-extrabold uppercase tracking-wide text-amber-800">
                Final word!
              </p>
              <p className="text-xs font-semibold text-amber-900">
                Who&apos;s going to find the last one? 🏁
              </p>
            </div>
          </div>
        )}

        {isLocalPlayerFrozen && (
          <div className="word-soup-freeze-overlay pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-2xl">
            <div className="word-soup-freeze-card mx-4 max-w-[260px] rounded-2xl border-4 border-sky-200 bg-white/95 px-5 py-4 text-center shadow-lg">
              <div className="word-soup-freeze-snowflakes mb-2 text-3xl" aria-hidden="true">
                <span>🧊</span>
                <span>❄️</span>
                <span>🐧</span>
              </div>
              <p className="text-lg font-extrabold text-sky-700"> Incorrect guess!</p>
              <p className="mt-1 text-sm font-semibold text-sky-900">BRRR! You're Frozen! Chill for a bit!</p>
              <p className="mt-3 text-4xl font-black tabular-nums text-sky-600">{freezeSecondsLeft}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-500">seconds left</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}