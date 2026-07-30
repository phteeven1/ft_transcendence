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
  playerStreaks: Record<number, number>;
  /** Players who abandoned mid-game: playerId → display name */
  leftPlayers: Record<number, string>;
  solutionWords: string[];
  foundWords: FoundWord[];
  frozenUntil: Record<number, number>;
  isIntroAlreadyShown: Record<number, boolean>;
  /** Wall-clock ms when the shared intro timeline began (for synced playback). */
  introStartedAt: number;
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
  /** Shared intro timeline start (epoch ms). */
  introStartedAt: number;
  isComplete: boolean;
}
