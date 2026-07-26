'use client';

export type CourtSize = 'S' | 'M' | 'L';

export const COURT_COLS = 18;
export const COURT_ROWS = 10;
export const COURT_TILE_GAP = 4;

export const COURT_SIZE_ORDER: CourtSize[] = ['L', 'M', 'S'];

export const SIZE_CONFIG: Record<
  CourtSize,
  { tileSize: number; padding: number; fontSize: number }
> = {
  S: { tileSize: 20, padding: 2, fontSize: 16 },
  M: { tileSize: 32, padding: 3, fontSize: 16 },
  L: { tileSize: 46, padding: 4, fontSize: 22 },
};

export function computeGridWidth(size: CourtSize): number {
  const { tileSize, padding } = SIZE_CONFIG[size];
  return COURT_COLS * tileSize + (COURT_COLS - 1) * COURT_TILE_GAP + padding * 2;
}

export function computeGridHeight(size: CourtSize): number {
  const { tileSize, padding } = SIZE_CONFIG[size];
  return COURT_ROWS * tileSize + (COURT_ROWS - 1) * COURT_TILE_GAP + padding * 2;
}

/** Largest court size that fits within `availableWidth` (falls back to S). */
export function largestCourtSizeFitting(availableWidth: number): CourtSize {
  for (const size of COURT_SIZE_ORDER) {
    if (computeGridWidth(size) <= availableWidth) {
      return size;
    }
  }
  return 'S';
}

export function getDefaultCourtSize(): CourtSize {
  if (typeof window === 'undefined') return 'L';
  const sidePanelAllowance = window.innerWidth >= 1024 ? 200 : 32;
  const available = window.innerWidth - sidePanelAllowance;
  return largestCourtSizeFitting(available);
}
