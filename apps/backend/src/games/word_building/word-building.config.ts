/**
 * Single source of truth for Word Building puzzle-generation settings.
 *
 * When dynamicWindowSize is true the board shrinks to fit the generated
 * content (puzzle bounds + dynamicWindowBuffer tiles of black padding on
 * each side, forced square). boardCols / boardRows are used only when
 * dynamicWindowSize is false.
 *
 * Changing values here affects every newly generated game; multiplayer
 * safety is maintained because the server generates and stores the puzzle
 * before any client renders it.
 */
export const WORD_BUILDING_CONFIG = {
  /** Default board column count used when dynamicWindowSize is false */
  boardCols: 18,
  /** Default board row count used when dynamicWindowSize is false */
  boardRows: 18,
  /** Maximum placement passes per generation run */
  maxAttempts: 80,
  /** Soft cap on placed word count — generation stops when reached */
  targetWords: 10,
  /** Number of puzzle candidates generated; the densest one is used */
  candidateCount: 3,
  /** Stop generating when placement ratio meets or exceeds this threshold */
  earlyExitPlacementRatio: 0.8,
  /** Persist mid-game state every N placements to limit data loss on crash */
  persistenceInterval: 5,
  /** Shrink the board to fit the generated puzzle + buffer instead of the fixed size */
  dynamicWindowSize: false,
  /** Black-tile border on each side around generated content (2 or 3 tiles) */
  dynamicWindowBuffer: 2,
} as const;

/** Working grid side length for the crossword engine (square, min of board dims). */
export const WORD_BUILDING_GRID_SIZE = Math.min(
  WORD_BUILDING_CONFIG.boardCols,
  WORD_BUILDING_CONFIG.boardRows,
);
