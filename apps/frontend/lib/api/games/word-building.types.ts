
//
// Mirror of the backend word-building.types.ts — only the types the frontend needs.

export type CellStatus = 'correct' | 'wrong' | 'empty' | 'none';

export type CourtCell = {
  char:        string;
  status:      CellStatus;
  clueNumber?: number;
  placedBy?:   number;
};

export type ClueEntry = {
  number:    number;
  clue:      string;
  row:       number;
  col:       number;
  direction: 'across' | 'down';
};

export type IInitCourtResponse = {
  trueCourt:       CourtCell[][];
  visibleCourt:    CourtCell[][];
  availableLetters: string[];
  clues: {
    across: ClueEntry[];
    down:   ClueEntry[];
  };
  /** playerId → name, for participants who had already left before this init/rehydrate call. */
  leftPlayers: Record<number, string>;
  hasPlayerSeenIntro: boolean;
  introStartedAt: number;
  playStartedAt: number;
};

export type IGameStatePayload = {
  visibleCourt: CourtCell[][];
  scores:       Array<{ playerId: number; score: number }>;
  solved:       boolean;
  revision:     number;
};

export type IPlaceLetterDto = {
  gameId:   number;
  playerId: number;
  row:      number;
  col:      number;
  letter:   string;
};

// ─── Cell locking ─────────────────────────────────────────────────────────────

export type ICellLocksPayload = {
  locks: Array<{
    row:        number;
    col:        number;
    playerId:   number;
    playerName: string;
    expiresAt:  number;
  }>;
};

export type ILockCellDto = {
  gameId:     number;
  playerId:   number;
  playerName: string;
  row:        number;
  col:        number;
};
