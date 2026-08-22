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
  char: string; // current letter, or '' when empty / black
  status: CellStatus;
  clueNumber?: number; // set when this cell is the start of an across/down word
  placedBy?: number; // playerId of first correct placer (only when status==='correct')
};

// ─── Clue types ───────────────────────────────────────────────────────────────

export type ClueEntry = {
  number: number;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  word: string; // stored server-side; stripped before sending to client
};

export type ClueMap = {
  across: ClueEntry[];
  down: ClueEntry[];
};

// ─── Cell locking ─────────────────────────────────────────────────────────────

/**
 * One soft lock record: which player reserved a cell and when it expires.
 */
export type ICellLock = {
  playerId: number;
  playerName: string;
  expiresAt: number; // Unix timestamp (ms)
};

/** Emitted by client → server when a player selects a cell for editing. */
export type ILockCellDto = {
  gameId: number;
  playerId: number;
  playerName: string;
  row: number;
  col: number;
};

/** Broadcast server → all clients whenever the lock map changes. */
export type ICellLocksPayload = {
  locks: Array<{
    row: number;
    col: number;
    playerId: number;
    playerName: string;
    expiresAt: number;
  }>;
};

// ─── In-memory live state (per game, lives in WordBuildingService Map) ─────────

export type ILiveGameState = {
  solution: (string | null)[][]; // correct answer — never leaves the backend
  playerGrid: (string | null)[][]; // letters currently placed by players
  creditGrid: (number | null)[][]; // playerId of first correct placer per cell
  scores: Map<number, number>; // playerId → current point total
  clues: ClueMap;
  revision: number;
  locks: Map<string, ICellLock>; // soft reservations: key = "row,col"
  /**
   * playerId → name, for participants who left this active match. GamePlayer
   * rows are never deleted on leave (final scores must survive), so this is
   * the only record of who is still actively playing vs. who has left.
   */
  leftPlayers: Map<number, string>;
  /** Shared intro timeline start (epoch ms). */
  introStartedAt: number;
  /** Play clock start after intro (epoch ms). */
  playStartedAt: number;
  /** Per-player intro completion flags. */
  isIntroAlreadyShown: Map<number, boolean>;
};

// ─── WebSocket payloads ───────────────────────────────────────────────────────

/** Emitted by client → server when a player places a letter. */
export type IPlaceLetterDto = {
  gameId: number;
  playerId: number;
  row: number;
  col: number;
  letter: string;
};

/**
 * Set only on the single placement that completes the puzzle (transitions
 * `solved` from false to true) — the authoritative source for the final-letter
 * celebration broadcast. Absent on every other placement.
 */
export type IFinalPlacement = {
  playerId: number;
  letter: string;
  row: number;
  col: number;
};

/** Broadcast server → all clients after every letter placement. */
export type IGameStatePayload = {
  visibleCourt: CourtCell[][]; // full grid with status info — no solution data
  scores: Array<{ playerId: number; score: number }>;
  solved: boolean;
  revision: number;
  finalPlacement?: IFinalPlacement;
};

/** Response shape for POST /games/:id/initWordBuildingCourt */
export type IInitCourtResponse = {
  trueCourt: CourtCell[][]; // correct layout — used client-side for clue numbers
  visibleCourt: CourtCell[][]; // initial state — all word cells are 'empty'
  availableLetters: string[]; // unique letters from solution, sorted locale-aware
  clues: { across: Omit<ClueEntry, 'word'>[]; down: Omit<ClueEntry, 'word'>[] };
  /**
   * playerId → name, for participants who had already left this match before
   * this init/rehydrate call. Lets a client that (re)connects after another
   * player left learn that without waiting for a live game:playerLeft event.
   */
  leftPlayers: Record<number, string>;
  hasPlayerSeenIntro: boolean;
  introStartedAt: number;
  playStartedAt: number;
};
