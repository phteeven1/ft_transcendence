import { WORD_POOL } from './pools/default.pool';

// ── Types ────────────────────────────────────────────────────────────────────

/** Puzzle difficulty tier; controls word count, grid size, hints, and pool filtering. */
export type WordDifficulty = 'easy' | 'medium' | 'hard';

/** Supported language codes for multilingual word pools and custom entries. */
export type LanguageCode = 'en' | 'de' | 'fr';

/** A single crossword answer with its clue and metadata used during puzzle generation. */
export type WordEntry = {
  word: string;
  clue: string;
  difficulty: WordDifficulty;
  tags: string[];
  /** Defaults to `'en'` when omitted. */
  language?: LanguageCode;
};

/** Generation parameters tied to a difficulty tier (grid size, word count, hints, etc.). */
export type DifficultyConfig = {
  wordCount: number;
  gridSize: number;
  maxAttempts: number;
  hints: number;
};

// ── Difficulty presets ───────────────────────────────────────────────────────

/** Default generation settings per difficulty tier, consumed by the crossword service. */
export const DIFFICULTY_CONFIG: Record<WordDifficulty, DifficultyConfig> = {
  easy: { wordCount: 5, gridSize: 15, maxAttempts: 60, hints: 5 },
  medium: { wordCount: 8, gridSize: 20, maxAttempts: 80, hints: 3 },
  hard: { wordCount: 12, gridSize: 25, maxAttempts: 100, hints: 1 },
};

// ── Word pool ─────────────────────────────────────────────────────────────────

// Plug-and-play: swap the active word pool by changing the import above.
export { WORD_POOL };

// ── Word selection helpers ────────────────────────────────────────────────────

/**
 * Returns a shuffled subset of the active word pool filtered by difficulty and optional tags.
 * Easy keeps only easy words; medium excludes hard; hard accepts the full pool.
 * Used as the default word source when generating a puzzle from the built-in pool.
 */
export function getWordsByDifficulty(
  difficulty: WordDifficulty,
  tags: string[] = [],
): WordEntry[] {
  let pool = WORD_POOL.filter((entry) => {
    const difficultyMatch =
      difficulty === 'hard'
        ? true
        : difficulty === 'medium'
          ? entry.difficulty !== 'hard'
          : entry.difficulty === 'easy';

    const tagMatch = tags.length === 0 || entry.tags.some((t) => tags.includes(t));
    return difficultyMatch && tagMatch;
  });

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool;
}

/**
 * Converts user-supplied answer/clue pairs into normalized WordEntry objects for generation.
 * Falls back to {@link getWordsByDifficulty} when fewer than two custom entries are provided.
 * Used when a puzzle is built from a vocabulary list or ad-hoc custom words instead of the pool.
 */
export function getWordsFromEntries(
  rawEntries: Array<{ answer: string; clue: string }>,
  difficulty: WordDifficulty = 'medium',
): WordEntry[] {
  if (!rawEntries || rawEntries.length < 2) {
    return getWordsByDifficulty(difficulty);
  }

  return rawEntries
    .map((e) => ({
      word: e.answer.toUpperCase().replace(/[^\p{L}]/gu, ''),
      clue: e.clue,
      difficulty: 'medium' as WordDifficulty,
      tags: ['custom'],
      language: 'en' as LanguageCode,
    }))
    .filter((e) => e.word.length > 1);
}
