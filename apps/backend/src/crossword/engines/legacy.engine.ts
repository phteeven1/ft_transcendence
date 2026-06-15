/**
 * Legacy crossword engine that creates simple crossword puzzles
 * with intersecting words, similar to the word-building plugin functionality.
 */
import { CrosswordCell } from '../crossword.types';
import { CrosswordEngine, EngineResult } from './crossword-engine.interface';

type PlacementDirection = 'across' | 'down';

type WorkingPlacement = {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: PlacementDirection;
};

const WORD_PATTERN = /^[A-Z]+$/;

function normalizeWord(rawWord: string): string {
  return rawWord.trim().toUpperCase();
}

function toCandidatesFromEntries(
  entries: Array<{ word: string; clue: string }>,
): Array<{ word: string; clue: string }> {
  const candidates: Array<{ word: string; clue: string }> = [];
  const seenWords = new Set<string>();

  entries.forEach((entry) => {
    const normalizedWord = normalizeWord(entry.word);
    if (!WORD_PATTERN.test(normalizedWord)) {
      return;
    }
    if (seenWords.has(normalizedWord)) {
      return;
    }

    seenWords.add(normalizedWord);
    candidates.push({ word: normalizedWord, clue: entry.clue });
  });

  // Sort by length descending to place longer words first
  return candidates.sort((a, b) => b.word.length - a.word.length);
}

export class LegacyEngine implements CrosswordEngine {
  private readonly GRID_SIZE: number;
  private readonly MAX_WORDS: number;

  constructor(gridSize = 10, maxWords = 6) {
    this.GRID_SIZE = gridSize;
    this.MAX_WORDS = maxWords;
  }

  generate(entries: Array<{ word: string; clue: string }>): EngineResult {
    const candidates = toCandidatesFromEntries(entries)
      .filter((entry) => entry.word.length >= 3 && entry.word.length <= this.GRID_SIZE)
      .slice(0, this.MAX_WORDS * 2); // Get more candidates than needed for better placement

    if (candidates.length === 0) {
      return { rows: 0, cols: 0, solution: [], placements: [] };
    }

    const grid = this.createEmptyGrid();
    const placedWords: WorkingPlacement[] = [];

    // Place first word in the center
    const firstCandidate = candidates[0];
    if (firstCandidate) {
      const startCol = Math.max(0, Math.floor((this.GRID_SIZE - firstCandidate.word.length) / 2));
      this.placeWord(grid, firstCandidate.word, Math.floor(this.GRID_SIZE / 2), startCol, 'across');
      placedWords.push({
        word: firstCandidate.word,
        clue: firstCandidate.clue,
        row: Math.floor(this.GRID_SIZE / 2),
        col: startCol,
        direction: 'across',
      });
    }

    // Try to place remaining words by finding intersections
    for (let i = 1; i < candidates.length && placedWords.length < this.MAX_WORDS; i++) {
      const candidate = candidates[i];
      if (placedWords.some((p) => p.word === candidate.word)) continue;

      const placement = this.findPlacementByIntersection(grid, placedWords, candidate);
      if (placement) {
        placedWords.push(placement);
      }
    }

    // Trim the grid to remove empty borders
    const { trimmed, offsetRow, offsetCol } = this.trimGrid(grid);

    // Adjust placements after trimming
    const adjustedPlacements = placedWords.map((p) => ({
      ...p,
      row: p.row - offsetRow,
      col: p.col - offsetCol,
    }));

    // Assign clue numbers
    const numberedPlacements = this.assignClueNumbers(adjustedPlacements);

    return {
      rows: trimmed.length,
      cols: trimmed[0]?.length ?? 0,
      solution: trimmed,
      placements: numberedPlacements,
    };
  }

  private findPlacementByIntersection(
    grid: CrosswordCell[][],
    placedWords: WorkingPlacement[],
    candidate: { word: string; clue: string },
  ): WorkingPlacement | null {
    const gridSize = grid.length;

    for (const placedWord of placedWords) {
      // Try to find intersections between the candidate and already placed words
      for (let candidateIndex = 0; candidateIndex < candidate.word.length; candidateIndex++) {
        for (let placedIndex = 0; placedIndex < placedWord.word.length; placedIndex++) {
          if (candidate.word[candidateIndex] !== placedWord.word[placedIndex]) {
            continue;
          }

          // Calculate the crossing point coordinates
          const crossingRow =
            placedWord.direction === 'across' ? placedWord.row : placedWord.row + placedIndex;
          const crossingCol =
            placedWord.direction === 'across' ? placedWord.col + placedIndex : placedWord.col;

          // Determine the direction for the new word (perpendicular to existing)
          const direction: PlacementDirection =
            placedWord.direction === 'across' ? 'down' : 'across';

          // Calculate starting position
          const startRow = direction === 'across' ? crossingRow : crossingRow - candidateIndex;
          const startCol = direction === 'across' ? crossingCol - candidateIndex : crossingCol;

          if (startRow < 0 || startCol < 0 || startRow >= gridSize || startCol >= gridSize) {
            continue;
          }

          // Check if the word can be placed at this position
          if (!this.canPlaceWord(grid, candidate.word, startRow, startCol, direction)) {
            continue;
          }

          // Place the word
          this.placeWord(grid, candidate.word, startRow, startCol, direction);
          return {
            word: candidate.word,
            clue: candidate.clue,
            row: startRow,
            col: startCol,
            direction,
          };
        }
      }
    }

    return null;
  }

  private canPlaceWord(
    grid: CrosswordCell[][],
    word: string,
    row: number,
    col: number,
    direction: PlacementDirection,
  ): boolean {
    const gridSize = grid.length;

    for (let index = 0; index < word.length; index++) {
      const targetRow = direction === 'across' ? row : row + index;
      const targetCol = direction === 'across' ? col + index : col;

      if (targetRow < 0 || targetRow >= gridSize || targetCol < 0 || targetCol >= gridSize) {
        return false;
      }

      const existingSolution = grid[targetRow][targetCol];
      if (existingSolution !== null && existingSolution !== word[index]) {
        return false;
      }
    }

    return true;
  }

  private createEmptyGrid(): CrosswordCell[][] {
    return Array.from({ length: this.GRID_SIZE }, () =>
      Array.from({ length: this.GRID_SIZE }, () => null),
    );
  }

  private placeWord(
    grid: CrosswordCell[][],
    word: string,
    row: number,
    col: number,
    direction: PlacementDirection,
  ): void {
    for (let index = 0; index < word.length; index++) {
      const targetRow = direction === 'across' ? row : row + index;
      const targetCol = direction === 'across' ? col + index : col;
      grid[targetRow][targetCol] = word[index];
    }
  }

  private trimGrid(grid: CrosswordCell[][]): {
    trimmed: CrosswordCell[][];
    offsetRow: number;
    offsetCol: number;
  } {
    let minRow = grid.length,
      maxRow = -1;
    let minCol = grid[0]?.length ?? 0,
      maxCol = -1;

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] !== null) {
          if (r < minRow) minRow = r;
          if (r > maxRow) maxRow = r;
          if (c < minCol) minCol = c;
          if (c > maxCol) maxCol = c;
        }
      }
    }

    if (maxRow === -1) return { trimmed: [[]], offsetRow: 0, offsetCol: 0 };

    const trimmed: CrosswordCell[][] = [];
    for (let r = minRow; r <= maxRow; r++) {
      trimmed.push(grid[r].slice(minCol, maxCol + 1));
    }
    return { trimmed, offsetRow: minRow, offsetCol: minCol };
  }

  private assignClueNumbers(
    placements: WorkingPlacement[],
  ): EngineResult['placements'] {
    const sorted = [...placements].sort((a, b) => (a.row !== b.row ? a.row - b.row : a.col - b.col));

    const cellNumberMap = new Map<string, number>();
    let next = 1;

    for (const p of sorted) {
      const key = `${p.row},${p.col}`;
      if (!cellNumberMap.has(key)) {
        cellNumberMap.set(key, next++);
      }
    }

    return sorted.map((p) => ({
      word: p.word,
      clue: p.clue,
      row: p.row,
      col: p.col,
      direction: p.direction,
      number: cellNumberMap.get(`${p.row},${p.col}`)!,
    }));
  }
}
