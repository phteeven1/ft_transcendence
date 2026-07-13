export type CourtCell = {
  char: string;
  revealed: boolean;
  highlightedByPlayerId?: number;
};

export const FREEZE_DURATION_SECONDS = 5;
export const POINTS_PER_WORD = 10;

export type Direction = [number, number];

export type GuessResult =
  | {
      success: true;
      word: string;
      cells: { row: number; col: number }[];
      direction: Direction;
      message: string;
      playerScores: Record<number, number>;
      state: WordSoupStateSnapshot;
    }
  | {
      success: false;
      message: string;
      frozen?: boolean;
      frozenUntil?: number;
    };

export type Position = {
  row: number;
  col: number;
};

export type SharedWordSoupCourt = {
  trueCourt: CourtCell[][];
  visibleCourt: CourtCell[][];
  playerColours: Record<number, string>;
  playerScores: Record<number, number>;
  playerWordCounts: Record<number, number>;
  solutionWords: string[];
  solvedWords: string[];
  frozenUntil: Record<number, number>;
};

export interface InitCourtResponse {
  visibleCourt: CourtCell[][];
  playerColours: Record<number, string>;
  playerWordCounts: Record<number, number>;
  solutionWords: string[];
}

export type WordSoupStateSnapshot = {
  visibleCourt: CourtCell[][];
  playerScores: Record<number, number>;
  playerWordCounts: Record<number, number>;
  playerColours: Record<number, string>;
  solutionWords: string[];
  solvedWords: string[];
  frozenPlayers: Record<number, number>;
};
