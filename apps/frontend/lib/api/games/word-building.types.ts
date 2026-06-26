
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
  trueCourt:    CourtCell[][];
  visibleCourt: CourtCell[][];
  clues: {
    across: ClueEntry[];
    down:   ClueEntry[];
  };
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
