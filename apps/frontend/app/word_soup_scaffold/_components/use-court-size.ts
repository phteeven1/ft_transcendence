'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  computeGridWidth,
  getDefaultCourtSize,
  largestCourtSizeFitting,
  type CourtSize,
} from './court-size';

/**
 * Owns court size with manual S/M/L override, while auto-fitting when the
 * available column width shrinks (or on first layout).
 */
export function useCourtSize() {
  const [courtSize, setCourtSize] = useState<CourtSize>(() => getDefaultCourtSize());
  const manualOverrideRef = useRef(false);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const fitToWidth = useCallback((width: number) => {
    if (width <= 0) return;
    const maxFit = largestCourtSizeFitting(width);

    setCourtSize((current) => {
      if (!manualOverrideRef.current) {
        return maxFit;
      }
      const order = { S: 0, M: 1, L: 2 } as const;
      return order[current] > order[maxFit] ? maxFit : current;
    });
  }, []);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      fitToWidth(entry.contentRect.width);
    });

    observer.observe(node);
    fitToWidth(node.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, [fitToWidth]);

  const onCourtSizeChange = useCallback((size: CourtSize) => {
    manualOverrideRef.current = true;
    const node = frameRef.current;
    if (node) {
      const maxFit = largestCourtSizeFitting(node.getBoundingClientRect().width);
      const order = { S: 0, M: 1, L: 2 } as const;
      setCourtSize(order[size] > order[maxFit] ? maxFit : size);
    } else {
      setCourtSize(size);
    }
  }, []);

  return {
    courtSize,
    courtWidthPx: computeGridWidth(courtSize),
    frameRef,
    onCourtSizeChange,
  };
}
