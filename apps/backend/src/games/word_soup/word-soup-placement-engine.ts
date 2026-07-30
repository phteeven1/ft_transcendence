import type { CourtCell, Direction } from './word-soup.types';
import {
  COURT_COLS,
  COURT_ROWS,
  CROSSING_WORD_BUDGET,
} from './word-soup.constants';

const R: Direction = [0, 1];
const D: Direction = [1, 0];
const DIRECTIONS: Direction[] = [R, D];

export type Placement = {
  row: number;
  col: number;
  direction: Direction;
  overlaps: number;
};

export type PlacementMode = 'centre' | 'prefer-cross' | 'avoid-cross';

export type GenerateCourtResult = {
  trueCourt: CourtCell[][];
  placedWords: string[];
};

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createEmptyCourt(
  rows = COURT_ROWS,
  cols = COURT_COLS,
): CourtCell[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      char: '',
    })),
  );
}

export function canPlace(
  trueCourt: CourtCell[][],
  word: string,
  row: number,
  col: number,
  [dx, dy]: Direction,
): boolean {
  const rows = trueCourt.length;
  const cols = trueCourt[0]?.length ?? 0;

  for (let i = 0; i < word.length; i++) {
    const r = row + i * dx;
    const c = col + i * dy;

    if (r < 0 || c < 0 || r >= rows || c >= cols) return false;

    const cell = trueCourt[r][c];
    if (cell.char !== '' && cell.char !== word[i]) return false;
  }

  return true;
}

/** How many letters of `word` would land on matching letters already on the court. */
export function countLetterOverlaps(
  trueCourt: CourtCell[][],
  word: string,
  row: number,
  col: number,
  [dx, dy]: Direction,
): number {
  let overlaps = 0;
  for (let i = 0; i < word.length; i++) {
    const cell = trueCourt[row + i * dx][col + i * dy];
    if (cell.char === word[i]) overlaps += 1;
  }
  return overlaps;
}

export function collectValidPlacements(
  trueCourt: CourtCell[][],
  word: string,
): Placement[] {
  const rows = trueCourt.length;
  const cols = trueCourt[0]?.length ?? 0;
  const placements: Placement[] = [];

  for (const direction of DIRECTIONS) {
    const [dx, dy] = direction;
    const maxRow = dx === 0 ? rows - 1 : rows - word.length;
    const maxCol = dy === 0 ? cols - 1 : cols - word.length;
    if (maxRow < 0 || maxCol < 0) continue;

    for (let row = 0; row <= maxRow; row++) {
      for (let col = 0; col <= maxCol; col++) {
        if (!canPlace(trueCourt, word, row, col, direction)) continue;
        placements.push({
          row,
          col,
          direction,
          overlaps: countLetterOverlaps(trueCourt, word, row, col, direction),
        });
      }
    }
  }

  return placements;
}

export function pickPlacement(
  placements: Placement[],
  mode: PlacementMode,
  rows = COURT_ROWS,
  cols = COURT_COLS,
): Placement | null {
  if (placements.length === 0) return null;

  let candidates = placements;

  if (mode === 'prefer-cross') {
    const crossing = placements.filter((placement) => placement.overlaps > 0);
    if (crossing.length > 0) {
      const maxOverlaps = Math.max(
        ...crossing.map((placement) => placement.overlaps),
      );
      candidates = crossing.filter(
        (placement) => placement.overlaps === maxOverlaps,
      );
    }
  } else if (mode === 'avoid-cross') {
    const isolated = placements.filter((placement) => placement.overlaps === 0);
    if (isolated.length > 0) {
      candidates = isolated;
    }
  } else {
    const centreRow = (rows - 1) / 2;
    const centreCol = (cols - 1) / 2;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const placement of placements) {
      const distance =
        Math.abs(placement.row - centreRow) +
        Math.abs(placement.col - centreCol);
      if (distance < bestDistance) bestDistance = distance;
    }
    const nearCentre = placements.filter((placement) => {
      const distance =
        Math.abs(placement.row - centreRow) +
        Math.abs(placement.col - centreCol);
      return distance <= bestDistance + 2;
    });
    candidates = nearCentre.length > 0 ? nearCentre : placements;
  }

  return shuffle(candidates)[0] ?? null;
}

export function placeWord(
  trueCourt: CourtCell[][],
  word: string,
  row: number,
  col: number,
  direction: Direction,
): boolean {
  if (!canPlace(trueCourt, word, row, col, direction)) return false;

  const [dx, dy] = direction;
  for (let i = 0; i < word.length; i++) {
    const r = row + i * dx;
    const c = col + i * dy;
    trueCourt[r][c] = {
      ...trueCourt[r][c],
      char: word[i],
    };
  }

  return true;
}

/**
 * Places words on an empty court. Returns only words that were successfully placed.
 * Longer words are attempted first so they form anchors for later crossings.
 */
export function generateTrueCourt(
  words: string[],
  crossingBudget = CROSSING_WORD_BUDGET,
): GenerateCourtResult {
  const trueCourt = createEmptyCourt();
  const orderedWords = [...words].sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  );
  const placedWords: string[] = [];
  let crossingsUsed = 0;

  for (let index = 0; index < orderedWords.length; index++) {
    const word = orderedWords[index];
    if (!word) continue;

    const placements = collectValidPlacements(trueCourt, word);
    const mode: PlacementMode =
      index === 0
        ? 'centre'
        : crossingsUsed < crossingBudget
          ? 'prefer-cross'
          : 'avoid-cross';
    const chosen = pickPlacement(placements, mode);
    if (!chosen) continue;

    if (mode === 'prefer-cross' && chosen.overlaps > 0) {
      crossingsUsed += 1;
    }

    placeWord(trueCourt, word, chosen.row, chosen.col, chosen.direction);
    placedWords.push(word);
  }

  return { trueCourt, placedWords };
}

/** Longest word that can fit on the court in a straight line. */
export function maxPlaceableWordLength(
  rows = COURT_ROWS,
  cols = COURT_COLS,
): number {
  return Math.max(rows, cols);
}

const WORD_PATTERN = /^[A-Z]+(?:[ -][A-Z]+)*$/;

/**
 * Normalize and filter vocabulary entries for Word Soup placement.
 * Allows spaces/hyphens between letter runs (e.g. "BUS STOP") so phrases stay playable.
 * Rejects empty strings, other punctuation, and words longer than the grid.
 */
export function normalizeVocabularyWords(
  rawWords: string[],
  maxLength = maxPlaceableWordLength(),
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of rawWords) {
    const word = raw.trim().toUpperCase().replace(/\s+/g, ' ');
    if (!word || !WORD_PATTERN.test(word)) continue;
    if (word.length > maxLength) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    result.push(word);
  }

  return result;
}
