export const WORD_SOUP_TILE_ANIM_MS = 140;
export const WORD_SOUP_BANNER_MS =  1200;
export const WORD_SOUP_FINAL_WORD_MS = 4500;
export const POINTS_PER_WORD = 10;

type WordCelebrationPhase = 'animating' | 'banner' | 'final-word';

export type WordCelebration = {
  phase: WordCelebrationPhase;
  playerId: number;
  playerName: string;
  word: string;
  points: number;
  orderedCells: Array<{ row: number; col: number }>;
  activeIndex: number;
};

export function orderCellsAlongDirection(
  cells: Array<{ row: number; col: number }>,
  direction?: [number, number],
): Array<{ row: number; col: number }> {
  if (cells.length <= 1) return cells;
  if (!direction) return cells;

  const [dr, dc] = direction;
  return [...cells].sort(
    (a, b) => a.row * dr + a.col * dc - (b.row * dr + b.col * dc),
  );
}
