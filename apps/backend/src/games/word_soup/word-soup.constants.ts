/** Grid dimensions — must match COURT_COLS / COURT_ROWS on the frontend. */
export const COURT_COLS = 18;
export const COURT_ROWS = 10;

/** Number of words drawn from the vocabulary for a Word Soup round. */
export const WORDS_IN_GAME = 10;

/** How many words (after the first) may deliberately share letters with earlier ones. */
export const CROSSING_WORD_BUDGET = 2;

export const PLAYER_COLOURS = [
  '#e74c3c',
  '#3498db',
  '#c0ee19',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e67eed',
  '#34495e',
] as const;

/** Keep in sync with apps/frontend/app/hooks/word-soup/use-word-soup-intro.ts */
const INTRO_CHAR_MS = 42;
const INTRO_WORD_CHAR_MS = 70;
const INTRO_HOLD_AFTER_TYPE_MS = 900;
const INTRO_GAP_DURATION_MS = 380 + 420;
const INTRO_COUNTDOWN_STEP_MS = 750;
const INTRO_GO_HOLD_MS = 900;

const INTRO_WELCOME = 'Welcome to Word Soup!';
const INTRO_BRIEFING = 'In this game, you have to find words in the grid.';
const INTRO_WORDS_HEADER = 'Here are the words...';

function introSpeechBlockMs(text: string, charMs: number): number {
  return text.length * charMs + INTRO_HOLD_AFTER_TYPE_MS;
}

/**
 * Wall-clock length of the shared intro timeline through GO!, so the play
 * clock can start in sync for all clients.
 */
export function estimateIntroDurationMs(solutionWords: string[]): number {
  let total =
    introSpeechBlockMs(INTRO_WELCOME, INTRO_CHAR_MS) +
    INTRO_GAP_DURATION_MS +
    introSpeechBlockMs(INTRO_BRIEFING, INTRO_CHAR_MS) +
    INTRO_GAP_DURATION_MS +
    introSpeechBlockMs(INTRO_WORDS_HEADER, INTRO_CHAR_MS) +
    INTRO_GAP_DURATION_MS;

  for (const word of solutionWords) {
    total +=
      introSpeechBlockMs(word, INTRO_WORD_CHAR_MS) + INTRO_GAP_DURATION_MS;
  }

  total += INTRO_COUNTDOWN_STEP_MS * 3 + INTRO_GO_HOLD_MS;
  return total;
}
