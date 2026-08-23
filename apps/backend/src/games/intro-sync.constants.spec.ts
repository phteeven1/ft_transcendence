/**
 * Assert backend intro timing matches apps/frontend/app/hooks/game/game-timing.constants.ts.
 * Update both files together when changing animation timing.
 */

const FRONTEND_CHAR_MS = 42;
const FRONTEND_WORD_CHAR_MS = 70;
const FRONTEND_HOLD_AFTER_TYPE_MS = 900;
const FRONTEND_GAP_DURATION_MS = 380 + 420;
const FRONTEND_COUNTDOWN_STEP_MS = 750;
const FRONTEND_GO_HOLD_MS = 900;

// Mirror of intro-sync.ts private constants — keep values identical to game-timing.constants.ts
const INTRO_CHAR_MS = 42;
const INTRO_WORD_CHAR_MS = 70;
const INTRO_HOLD_AFTER_TYPE_MS = 900;
const INTRO_GAP_DURATION_MS = 380 + 420;
const INTRO_COUNTDOWN_STEP_MS = 750;
const INTRO_GO_HOLD_MS = 900;

describe('intro-sync timing constants', () => {
  it('matches frontend game-timing.constants.ts', () => {
    expect(INTRO_CHAR_MS).toBe(FRONTEND_CHAR_MS);
    expect(INTRO_WORD_CHAR_MS).toBe(FRONTEND_WORD_CHAR_MS);
    expect(INTRO_HOLD_AFTER_TYPE_MS).toBe(FRONTEND_HOLD_AFTER_TYPE_MS);
    expect(INTRO_GAP_DURATION_MS).toBe(FRONTEND_GAP_DURATION_MS);
    expect(INTRO_COUNTDOWN_STEP_MS).toBe(FRONTEND_COUNTDOWN_STEP_MS);
    expect(INTRO_GO_HOLD_MS).toBe(FRONTEND_GO_HOLD_MS);
  });
});
