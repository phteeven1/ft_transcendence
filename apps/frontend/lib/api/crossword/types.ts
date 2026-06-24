import type { CrosswordPuzzle, CrosswordUpdate } from '@/app/types';

export type CrosswordPuzzleDto = CrosswordPuzzle;
export type CrosswordUpdateDto = CrosswordUpdate;
export type CrosswordCheckResult = {
  solved: boolean;
  wrongCells: Array<{ row: number; col: number }>;
};
