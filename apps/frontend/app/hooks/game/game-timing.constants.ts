/**
 * Shared intro/outro animation timing for game overlays.
 * Keep in sync with apps/backend/src/games/intro-sync.ts (intro only).
 */

export const CHAR_MS = 42;
export const WORD_CHAR_MS = 70;
export const HOLD_AFTER_TYPE_MS = 900;
export const BUBBLE_FADE_MS = 380;
export const GAP_MS = 420;
export const GAP_DURATION_MS = BUBBLE_FADE_MS + GAP_MS;
export const COUNTDOWN_STEP_MS = 750;
export const GO_HOLD_MS = 900;

/** Padded stand-in so personalized welcome estimates cover long names. */
export const INTRO_ESTIMATE_PLAYER_NAME = 'XXXXXXXXXXXXXXXX';

export const DEFAULT_HOLD_DURATION_MS = 2000;
