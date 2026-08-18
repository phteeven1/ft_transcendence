'use client';
/*
  TileRack — a row of draggable letter tiles for the Word Building crossword game.

  Interaction model (Pointer Events):
    - Each tile listens for pointerdown to initiate a drag via useAntDrag hook.
    - As the pointer moves, the ant carrying animation tracks the cursor.
    - On pointerup, the hook finds the cell under the pointer and calls onDrop.

  Visual language reuses the tile style from scramble-puzzle.tsx:
    bg-white · border · inset shadow · rounded-lg · font-bold
  so both input surfaces feel consistent to players.

  Props:
    letters      — array of unique uppercase letters derived from the puzzle vocabulary.
    disabled     — disables all tiles (e.g., once puzzle is solved).
    onDrop       — callback fired when a tile is dropped on a cell (row, col, letter).
    onDragTarget — callback fired when the hovered drop-target cell changes during a drag.
*/

import { useEffect, useRef } from 'react';
import AntCarryCursor from './ant-carry-cursor';
import { useAntDrag } from './use-ant-drag';

interface Props {
  letters: string[];
  disabled?: boolean;
  onDrop?: (row: number, col: number, letter: string) => void;
  onDragTarget?: (row: number | null, col: number | null) => void;
}

/**
 * Renders a set of draggable letter tiles dynamically derived from the puzzle's vocabulary.
 * Supports any language (French, German, etc.) by extracting unique characters from the solution.
 * Uses pointer events and animated ant carry UI for drop interaction.
 *
 * @param letters Array of unique uppercase letters to render (e.g., ['A', 'B', 'É', 'Ü']).
 * @param disabled When true all tiles are non-draggable (used after puzzle is solved).
 * @param onDrop Callback fired when a letter is dropped on a cell: (row, col, letter) => void.
 * @param onDragTarget Callback fired when the drag target cell changes: (row|null, col|null) => void.
 */
export default function TileRack({ letters, disabled = false, onDrop, onDragTarget }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Ant drag hook handles pointer tracking, cell detection, and drop callback
  const { drag, startDrag, endCelebration } = useAntDrag(
    (row, col, letter) => {
      if (onDrop) {
        onDrop(row, col, letter);
      }
    },
  );

  // Notify parent when the drag target cell changes so GameCourt can highlight it.
  // Only fires when the cell identity changes (not on every pixel move).
  const prevTargetRef = useRef<{ row: number | null; col: number | null }>({ row: null, col: null });
  useEffect(() => {
    if (!onDragTarget) return;
    const row = drag?.targetRow ?? null;
    const col = drag?.targetCol ?? null;
    if (prevTargetRef.current.row !== row || prevTargetRef.current.col !== col) {
      prevTargetRef.current = { row, col };
      onDragTarget(row, col);
    }
  }, [drag?.targetRow, drag?.targetCol, onDragTarget]);

  // Clear drag target when drag ends
  useEffect(() => {
    if (!drag && (prevTargetRef.current.row !== null || prevTargetRef.current.col !== null)) {
      prevTargetRef.current = { row: null, col: null };
      onDragTarget?.(null, null);
    }
  }, [drag, onDragTarget]);

  const handlePointerDown = (letter: string, e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    // Capture pointer so pointermove/pointerup keep firing even after finger leaves the tile.
    // Guard: synthetic events in tests may not have a registered pointer id.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic event */ }
    startDrag(letter, e.clientX, e.clientY);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="flex flex-wrap gap-1 justify-center py-2 px-1"
      >
        {letters.map((letter) => (
          <div
            key={letter}
            onPointerDown={(e) => handlePointerDown(letter, e)}
            style={{
              touchAction: 'none',
              width: 'clamp(1.8rem, 3vmin, 3rem)',
              height: 'clamp(1.8rem, 3vmin, 3rem)',
              fontSize: 'clamp(0.7rem, 1.5vmin, 1rem)',
            }}
            className={[
              'flex items-center justify-center rounded-lg font-bold select-none clay-panel',
              disabled
                ? 'text-muted-foreground cursor-not-allowed opacity-50'
                : 'text-foreground cursor-grab hover:opacity-90 active:cursor-grabbing',
            ].join(' ')}
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Ant carry cursor animation — rendered globally while dragging */}
      {drag && (
        <AntCarryCursor
          letter={drag.letter}
          x={drag.x}
          y={drag.y}
          isDropping={drag.isDropping}
          onCelebrationEnd={endCelebration}
        />
      )}
    </>
  );
}
