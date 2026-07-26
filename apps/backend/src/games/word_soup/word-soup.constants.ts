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
