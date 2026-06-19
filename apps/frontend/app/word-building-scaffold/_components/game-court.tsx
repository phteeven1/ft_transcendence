'use client';

/*
  Renders the S/M/L size selector and the fixed-pixel game court grid.
  Size is local state: set once at mount based on screen width, then only
  changed by the player clicking S/M/L. Rotation and resize do not affect it.
  Each player has their own size — it is not shared via WebSocket.
*/

import { useState, useEffect } from 'react';
import CourtTile from './court-tile';
import type { CourtCell } from './court-tile';

const COURT_TILE_COUNT = 16;
const COURT_TILE_GAP = 4;

type CourtSize = 'S' | 'M' | 'L';

const SIZE_CONFIG: Record<CourtSize, { tileSize: number; padding: number; fontSize: number }> = {
  S: { tileSize: 20, padding: 2 , fontSize: 16 },
  M: { tileSize: 32, padding: 3 , fontSize: 16 },
  L: { tileSize: 46, padding: 4 , fontSize: 22 },
};

function computeGridSize(size: CourtSize): number {
  const { tileSize, padding } = SIZE_CONFIG[size];
  return (
    COURT_TILE_COUNT * tileSize +
    (COURT_TILE_COUNT - 1) * COURT_TILE_GAP +
    padding * 2
  );
}

// Detect default size once at mount. Below lg breakpoint (1024px) → M, else → L.
function getDefaultSize(): CourtSize {
  if (typeof window === 'undefined') return 'L';
  return window.innerWidth < 1024 ? 'S' : 'L';
}

interface Props {
  visibleCourt: CourtCell[][];
  onTileClick: (row: number, col: number) => void;
}

export default function GameCourt({ visibleCourt, onTileClick }: Props) {
  const [courtSize, setCourtSize] = useState<CourtSize>('L');

  // Set the default once on mount — never again automatically.
  useEffect(() => {
    setCourtSize(getDefaultSize());
  }, []);

  const { tileSize, padding, fontSize } = SIZE_CONFIG[courtSize];
  const gridSize = computeGridSize(courtSize);

  return (
    <div className="flex flex-col gap-2">
      {/* Size selector */}
      <div className="flex gap-2">
        {(['S', 'M', 'L'] as CourtSize[]).map((size) => (
          <button
            key={size}
            onClick={() => setCourtSize(size)}
            className={[
              'w-8 h-8 rounded font-bold text-sm transition-colors',
              courtSize === size
                ? 'bg-emerald-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50',
            ].join(' ')}
          >
            {size}
          </button>
        ))}
      </div>

      {/* Court grid — fixed pixel size, scrolls if it doesn't fit */}
      <div
        className="rounded-2xl bg-white shadow-xl"
        style={{
          width: `${gridSize}px`,
          minWidth: `${gridSize}px`,
          height: `${gridSize}px`,
          flexShrink: 0,
        }}
      >
        <div
          className="grid"
          style={{
            padding: `${padding}px`,
            gap: `${COURT_TILE_GAP}px`,
            gridTemplateColumns: `repeat(${COURT_TILE_COUNT}, ${tileSize}px)`,
            gridTemplateRows: `repeat(${COURT_TILE_COUNT}, ${tileSize}px)`,
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
