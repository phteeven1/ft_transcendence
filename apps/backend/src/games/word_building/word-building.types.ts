
//
// Single source of truth for all types used by the Word Building game.

// ─── Cell types ───────────────────────────────────────────────────────────────

/**
 * Visual status of one cell in the visible court.
 *   'correct' → green  (letter placed matches solution; award given)
 *   'wrong'   → red    (letter placed does not match solution)
 *   'empty'   → blue   (cell belongs to a word but no letter placed yet)
 *   'none'    → black  (cell is not part of any word — black square)
 */
export type CellStatus = 'correct' | 'wrong' | 'empty' | 'none';

/**
 * One cell as the frontend sees it.
 * All new fields are optional so word_soup CourtCell is unaffected.
 */
export type CourtCell = {
  char: string;           // current letter, or '' when empty / black
  status: CellStatus;
  clueNumber?: number;    // set when this cell is the start of an across/down word
  placedBy?: number;      // playerId of first correct placer (only when status==='correct')
};

// ─── Clue types ───────────────────────────────────────────────────────────────

export type ClueEntry = {
  number: number;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  word: string;  // stored server-side; stripped before sending to client
};

export type ClueMap = {
  across: ClueEntry[];
  down: ClueEntry[];
};

// ─── In-memory live state (per game, lives in WordBuildingService Map) ─────────

export type ILiveGameState = {
  solution:    (string | null)[][];   // correct answer — never leaves the backend
  playerGrid:  (string | null)[][];   // letters currently placed by players
  creditGrid:  (number | null)[][];   // playerId of first correct placer per cell
  scores:      Map<number, number>;   // playerId → current point total
  clues:       ClueMap;
  revision:    number;
};

// ─── WebSocket payloads ───────────────────────────────────────────────────────

/** Emitted by client → server when a player places a letter. */
export type IPlaceLetterDto = {
  gameId:   number;
  playerId: number;
  row:      number;
  col:      number;
  letter:   string;
};

/** Broadcast server → all clients after every letter placement. */
export type IGameStatePayload = {
  visibleCourt: CourtCell[][];   // full grid with status info — no solution data
  scores:       Array<{ playerId: number; score: number }>;
  solved:       boolean;
  revision:     number;
};

/** Response shape for POST /games/:id/initWordBuildingCourt */
export type IInitCourtResponse = {
  trueCourt:    CourtCell[][];   // correct layout — used client-side for clue numbers
  visibleCourt: CourtCell[][];   // initial state — all word cells are 'empty'
  clues:        { across: Omit<ClueEntry, 'word'>[]; down: Omit<ClueEntry, 'word'>[] };
};
