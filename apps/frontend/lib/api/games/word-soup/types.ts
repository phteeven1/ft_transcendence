// Word Soup API / socket contracts — keep fields limited to what the client uses.

export type WordSoupCourtCell = {
  char: string;
  highlightedByPlayerId?: number;
};

export type WordSoupFoundWord = {
  playerId: number;
  word: string;
  cells: Array<{ row: number; col: number }>;
  direction?: [number, number];
};

/** Full court snapshot from init / state sync. */
export type WordSoupDto = {
  visibleCourt: WordSoupCourtCell[][];
  playerColours: Record<number, string>;
  playerScores: Record<number, number>;
  playerWordCounts: Record<number, number>;
  playerStreaks?: Record<number, number>;
  leftPlayers?: Record<number, string>;
  solutionWords: string[];
  foundWords: WordSoupFoundWord[];
  frozenPlayers?: Record<number, number>;
  hasPlayerSeenIntro: boolean;
  /** Shared intro timeline start (epoch ms). */
  introStartedAt?: number;
  /** Epoch ms when the play clock starts (after intro countdown). */
  playStartedAt?: number;
  isComplete: boolean;
};

export type WordSoupFreezeNoticeDto = {
  playerId: number;
  playerName: string;
  message: string;
  /** Structured event kind from the socket (preferred over parsing `message`). */
  kind?: 'freeze' | 'unfreeze';
};

export type WordSoupGuessResultDto = {
  success: boolean;
  message: string;
  frozen?: boolean;
  frozenUntil?: number;
  word?: string;
};

/** Broadcast when a word is found — scores/court details live on `state`. */
export type WordSoupWordGuessedDto = {
  playerId: number;
  playerName?: string;
  word: string;
  cells: Array<{ row: number; col: number }>;
  direction?: [number, number];
  pointsEarned?: number;
  playerScores?: WordSoupDto['playerScores'];
  state?: WordSoupDto;
};
