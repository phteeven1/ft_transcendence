'use client';

// Drag & drop controller for the ant letter carry.
// Tracks the pointer while a letter tile is carried, finds the court cell
// under the pointer on release, and hands the drop to the game orchestrator.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface IAntDragState {
  letter: string;
  x: number;
  y: number;
  isDropping: boolean;
  /** Row index of the cell currently under the pointer, or null if none. */
  targetRow: number | null;
  /** Column index of the cell currently under the pointer, or null if none. */
  targetCol: number | null;
}

interface IAntDragApi {
  drag: IAntDragState | null;
  startDrag: (letter: string, clientX: number, clientY: number) => void;
  endCelebration: () => void;
}

interface IWordCellTarget {
  row: number;
  col: number;
  element: HTMLElement;
}

const WORD_CELL_SELECTOR = '[data-word-cell]';

/**
 * onDrop returns true when the placement was accepted (triggers celebration),
 * false when the cell was ineligible (drag cancelled silently).
 */
export function useAntDrag(onDrop: (row: number, col: number, letter: string) => boolean): IAntDragApi {
  const [drag, setDrag] = useState<IAntDragState | null>(null);
  const onDropRef = useRef(onDrop);
  const letterRef = useRef('');
  const pointerRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  // Synchronous flag — avoids the async gap between startDrag (sets React state)
  // and the effect cycle (registers listeners). Rapid taps can fire pointerup
  // before the effect runs; isCarryingRef catches them.
  const isCarryingRef = useRef(false);

  useEffect(() => {
    onDropRef.current = onDrop;
  }, [onDrop]);

  const flushPointerPosition = useCallback(() => {
    frameRef.current = null;
    const { x, y } = pointerRef.current;
    const hit = findWordCell(x, y);
    const tRow = hit?.row ?? null;
    const tCol = hit?.col ?? null;
    setDrag(current =>
      current && !current.isDropping
        ? { ...current, x, y, targetRow: tRow, targetCol: tCol }
        : current,
    );
  }, []);

  // Permanently-mounted listeners eliminate the async gap.
  // isCarryingRef gates each handler so they are no-ops between drags.
  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isCarryingRef.current) return;
      pointerRef.current = { x: event.clientX, y: event.clientY };
      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(flushPointerPosition);
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!isCarryingRef.current) return;
      isCarryingRef.current = false;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      const target = findWordCell(event.clientX, event.clientY);
      if (!target) {
        setDrag(null);
        return;
      }
      const center = getCellCenter(target.element);
      const letter = letterRef.current;
      const accepted = onDropRef.current(target.row, target.col, letter);
      if (accepted) {
        setDrag(current =>
          current
            ? { ...current, x: center.x, y: center.y, isDropping: true, targetRow: null, targetCol: null }
            : current,
        );
      } else {
        setDrag(null);
      }
    };

    const handlePointerCancel = () => {
      if (!isCarryingRef.current) return;
      isCarryingRef.current = false;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      setDrag(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [flushPointerPosition]); // stable — mounts once, never re-registers

  const startDrag = useCallback((letter: string, clientX: number, clientY: number) => {
    letterRef.current = letter;
    pointerRef.current = { x: clientX, y: clientY };
    isCarryingRef.current = true; // synchronous — no async React gap
    const hit = findWordCell(clientX, clientY);
    setDrag({
      letter, x: clientX, y: clientY, isDropping: false,
      targetRow: hit?.row ?? null, targetCol: hit?.col ?? null,
    });
  }, []);

  const endCelebration = useCallback(() => setDrag(null), []);

  return { drag, startDrag, endCelebration };
}

function findWordCell(clientX: number, clientY: number): IWordCellTarget | null {
  const hit = document.elementFromPoint(clientX, clientY);
  const element = hit?.closest(WORD_CELL_SELECTOR);
  if (!(element instanceof HTMLElement)) return null;

  const row = Number(element.dataset.row);
  const col = Number(element.dataset.col);
  if (Number.isNaN(row) || Number.isNaN(col)) return null;

  return { row, col, element };
}

function getCellCenter(element: HTMLElement): { x: number; y: number } {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}