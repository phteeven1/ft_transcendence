/**
 * Word Soup client constants.
 * Keep COURT_COLS / COURT_ROWS / POINTS_PER_WORD / FREEZE_DURATION_SECONDS
 * aligned with apps/backend/src/games/word_soup/.
 */

export const COURT_COLS = 18;
export const COURT_ROWS = 10;
export const COURT_TILE_GAP = 4;

export const POINTS_PER_WORD = 10;
export const FREEZE_DURATION_SECONDS = 5;

/** Tile ripple step during word-found celebration. */
export const WORD_SOUP_TILE_ANIM_MS = 150;

/** Score +points overlay display duration. */
export const SCORE_POPUP_MS = 2200;

/** Delay before showing game-over overlay when no celebration is in flight. */
export const GAME_OVER_OVERLAY_GRACE_MS = 400;

/** Court stays fully visible for this long after the game ends before the host reveal. */
export const GAME_OVER_COURT_HOLD_MS = 2000;
