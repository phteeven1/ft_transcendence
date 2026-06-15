export type CrosswordEntry = {
  answer: string;
  clue: string;
};

export type CrosswordPlacement = {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  number?: number;
};

export type CrosswordCell = string | null;

export type CrosswordPuzzleInternal = {
  gameId: number;
  rows: number;
  cols: number;
  solution: CrosswordCell[][];
  playerGrid: CrosswordCell[][];
  clues: {
    across: CrosswordPlacement[];
    down: CrosswordPlacement[];
  };
  revision: number;
  solved: boolean;
};

export type CrosswordPuzzlePublic = Omit<CrosswordPuzzleInternal, 'solution'>;

export type CrosswordUpdate = {
  row: number;
  col: number;
  letter: string;
};
