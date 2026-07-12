'use client';

/*
  Renders the S/M/L size selector and the fixed-pixel game court grid.
  Size is local state: set once at mount based on screen width, then only
  changed by the player clicking S/M/L. Rotation and resize do not affect it.
  Each player has their own size — it is not shared via WebSocket.

  Grid dimensions are controlled by two constants at the top of this file:
  COURT_COLS and COURT_ROWS. Change these to resize the grid for this game.
  The matching constants in word-building-game.tsx must be kept in sync.
*/

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import CourtTile from './court-tile';
import type { CourtCell } from './court-tile';
import { Button } from '../../components/ui/button';

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
  onTileClick: (row: number, col: number) => void;
}

const SIZE_LABEL_KEYS = {
  S: 'courtSizeSmall',
  M: 'courtSizeMedium',
  L: 'courtSizeLarge',
} as const;

export default function GameCourt({ visibleCourt, onTileClick }: Props) {
  const t = useTranslations('games.wordSoup');
  const [courtSize, setCourtSize] = useState<CourtSize>(() => getDefaultSize());

  const { tileSize, padding, fontSize } = SIZE_CONFIG[courtSize];
  const gridWidth = computeGridWidth(courtSize);
  const gridHeight = computeGridHeight(courtSize);

  return (
    <div className="flex flex-col gap-2">
      {/* Size selector */}
      <div className="flex gap-2">
        {(['S', 'M', 'L'] as CourtSize[]).map((size) => (
          <Button
            key={size}
            variant={courtSize === size ? 'accent' : 'ghost'}
            size="sm"
            className="w-8 h-8 p-0"
            onClick={() => setCourtSize(size)}
          >
            {t(SIZE_LABEL_KEYS[size])}
          </Button>
        ))}
      </div>

      {/* Court grid — fixed pixel size, scrolls if it doesn't fit */}
      <div
        className="clay-panel rounded-2xl"
        style={{
          width: `${gridWidth}px`,
          minWidth: `${gridWidth}px`,
          height: `${gridHeight}px`,
          flexShrink: 0,
        }}
      >
        <div
          className="grid"
          style={{
            padding: `${padding}px`,
            gap: `${COURT_TILE_GAP}px`,
            gridTemplateColumns: `repeat(${COURT_COLS}, ${tileSize}px)`,
            gridTemplateRows: `repeat(${COURT_ROWS}, ${tileSize}px)`,
            gridAutoFlow: 'row',
          }}
        >
          {visibleCourt.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <CourtTile
                key={`${rowIndex}-${colIndex}`}
                cell={cell}
                row={rowIndex}
                col={colIndex}
                tileSize={tileSize}
                fontSize={fontSize}
                onClick={onTileClick}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
}