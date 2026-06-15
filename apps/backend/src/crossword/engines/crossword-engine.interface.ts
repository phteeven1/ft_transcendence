import { CrosswordCell, CrosswordPlacement } from '../crossword.types';

export type EngineResult = {
  rows: number;
  cols: number;
  solution: CrosswordCell[][];
  placements: CrosswordPlacement[];
};

export interface CrosswordEngine {
  generate(entries: Array<{ word: string; clue: string }>): EngineResult;
}
