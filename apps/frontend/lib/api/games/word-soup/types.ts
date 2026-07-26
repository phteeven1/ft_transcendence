// Word Soup API / socket contracts — keep fields limited to what the client uses.

export namespace WordSoup {

  export type CourtCell = {
    char: string;
    highlightedByPlayerId?: number;
  };

  export type FoundWord = {
    playerId: number;
    word: string;
    cells: Array<{ row: number; col: number }>;
    direction?: [number, number];
  };

  /** Full court snapshot from init / state sync. */
  export type Dto = {
    visibleCourt: CourtCell[][];
    playerColours: Record<number, string>;
    playerScores: Record<number, number>;
    playerWordCounts: Record<number, number>;
    playerStreaks?: Record<number, number>;
    leftPlayers?: Record<number, string>;
    solutionWords: string[];
    foundWords: FoundWord[];
    frozenPlayers?: Record<number, number>;
    hasPlayerSeenIntro: boolean;
    /** Shared intro timeline start (epoch ms). */
    introStartedAt?: number;
    isComplete: boolean;
  };

  export type GameStateDto = Dto;

  export type FreezeNoticeDto = {
    playerId: number;
    playerName: string;
    message: string;
  };

  /** Broadcast when a word is found — scores/court details live on `state`. */
  export type WordGuessedDto = {
    playerId: number;
    playerName?: string;
    word: string;
    cells: Array<{ row: number; col: number }>;
    direction?: [number, number];
    pointsEarned?: number;
    playerScores?: Dto['playerScores'];
    state?: GameStateDto;
  };
}
