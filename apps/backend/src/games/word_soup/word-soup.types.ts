export const FREEZE_DURATION_SECONDS = 5;
export const POINTS_PER_WORD = 10;

export type CourtCell = {
  char: string;
  highlightedByPlayerId?: number;
};

export type Direction = [number, number];

export type FoundWord = {
  playerId: number;
  cells: Position[];
  direction: Direction;
  word: string;
};

/** Structured failure reasons the client can localise. */
export type GuessMessageKey =
  | 'wrongPosition'
  | 'alreadyFoundElsewhere';

export type GuessResult =
  | {
      success: true;
      word: string;
      cells: { row: number; col: number }[];
      direction: Direction;
      playerScores: Record<number, number>;
      state: WordSoupGameState;
      solved: boolean;
    }
  | {
      success: false;
      message: string;
      /** Optional i18n key under games.wordSoup.guess.* */
      messageKey?: GuessMessageKey;
      frozen?: boolean;
      frozenUntil?: number;
    };

export type PlacedWordMetadata = {
  word: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  direction: Direction;
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
  playerStreaks: Record<number, number>;
  playerBestWordStreaks: Record<number, number>;
  playerFreezeCounts: Record<number, number>;
  leftPlayers: Record<number, string>;
  solutionWords: PlacedWordMetadata[];
  foundWords: FoundWord[];
  frozenUntil: Record<number, number>;
  isIntroAlreadyShown: Record<number, boolean>;
  introStartedAt: number;
  playStartedAt: number;
};

export interface WordSoupGameState {
  visibleCourt: CourtCell[][];
  playerScores: Record<number, number>;
  playerWordCounts: Record<number, number>;
  playerStreaks: Record<number, number>;
  leftPlayers: Record<number, string>;
  playerColours: Record<number, string>;
  solutionWords: string[];
  foundWords: FoundWord[];
  frozenPlayers: Record<number, number>;
  hasPlayerSeenIntro: boolean;
  introStartedAt: number;
  playStartedAt: number;
  isComplete: boolean;
}
