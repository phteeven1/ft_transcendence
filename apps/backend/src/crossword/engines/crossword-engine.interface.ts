import { CrosswordCell, CrosswordPlacement } from '../crossword.types';

export type IEngineResult = {
  rows: number;
  cols: number;
  solution: CrosswordCell[][];
  placements: CrosswordPlacement[];
};

export interface ICrosswordEngine {
  generate(entries: Array<{ word: string; clue: string }>): IEngineResult;
}
