// 1. Primitive Sub-Types

export namespace WordSoup {

  export type CourtCell = { 
    char: string;
    revealed: boolean;
    highlightedByPlayerId?: number;
  };

  export type FoundWord = {
    playerId: number;
    word: string;
    cells: Array<{ row: number; col: number }>;
    direction?: [number, number];
  };

  // 2. Core Game State
  export type Dto = {
    visibleCourt: CourtCell[][];
    playerColours: Record<number, string>;
    playerScores: Record<number, number>;
    playerWordCounts: Record<number, number>;
    playerStreaks?: Record<number, number>;
    leftPlayers?: Record<number, string>;
    solutionWords: string[];
    foundWords: FoundWord[];
    frozenPlayers: Record<number, number>;
    hasPlayerSeenIntro: boolean;
    isComplete: boolean;
  };

  // 3. Derived States
  export type GameStateDto = Omit<Dto, 'frozenPlayers'> & {
    frozenPlayers?: Record<number, number>;
  };

  // 4. Real-time Event DTOs (Socket / API Payloads)
  export type FreezeNoticeDto = {
    playerId: number;
    playerName: string;
    message: string;
  };

  export type WordGuessedDto = {
    playerId: number;
    playerName?: string;
    word: string;
    cells: Array<{ row: number; col: number }>;
    direction?: [number, number];
    message: string;
    pointsEarned?: number;
    playerScores?: Dto['playerScores'];
    playerWordCounts?: Dto['playerWordCounts'];
    state?: GameStateDto;
  };
}