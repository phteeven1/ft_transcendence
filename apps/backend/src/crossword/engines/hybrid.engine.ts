/**
 * @fileoverview HybridEngine: Advanced crossword engine with intersection-based placement.
 * 
 * Uses a greedy algorithm with seeded randomness to generate different puzzles each time.
 * 
 * Key features:
 * 1. Normalizes and filters input words, tracking all rejected words for feedback.
 * 2. Sorts words by length and common letter frequency to optimize placement order.
 * 3. Places the longest word in the center as an anchor.
 * 4. Iteratively finds valid placements for remaining words based on intersections with placed words.
 * 5. Scores placements using a heuristic that considers future intersection potential, center proximity, and letter matches.
 * 6. Randomly selects among top-scoring candidates to add variability.
 * 7. Trims empty grid borders and assigns clue numbers in final output.
 */

import { CrosswordCell } from '../crossword.types';
import { ICrosswordEngine, IEngineResult } from './crossword-engine.interface';

// --- Types (PascalCase) ---
type Direction = 'across' | 'down';

type CandidatePlacement = {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
  score?: number;
};

// Context object to reduce parameter counts and group related state
type PlacementContext = {
  grid: CrosswordCell[][];
  letterIndex: Map<string, { r: number; c: number }[]>;
  placedWordsSet: Set<string>;
  gridSize: number;
};

// --- Constants ---
// * Linear Congruential Generator (LCG) multiplier for seeding random number generation.
const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT = 1013904223;
const LCG_MODULUS = 4294967296;
const TOP_CANDIDATE_RATIO = 0.3; // Only consider the top 30% of candidates by score for random selection
const FUTURE_INTERSECTION_WEIGHT = 10; // Score weight for future intersection potential per detected intersection
const MAX_CENTER_BONUS = 10; // Maximum bonus score achievable for placing words near grid center
const LETTER_MATCH_WEIGHT = 5; // Score weight for matching letters with existing placed words
const MIN_WORD_LENGTH = 2; // Minimum word length to consider valid (shorter words not kid-friendly)

/**
 * Advanced crossword engine with intersection-based placement.
 * Uses a greedy algorithm with seeded randomness and strategic sorting.
 */
export class HybridEngine implements ICrosswordEngine {
  private readonly GRID_SIZE: number;
  private readonly MAX_ATTEMPTS: number;
  private readonly TARGET_WORDS: number;
  private seed: number;

  constructor(gridSize = 20, maxAttempts = 80, targetWords = 8, seed?: number) {
    this.GRID_SIZE = gridSize;
    this.MAX_ATTEMPTS = maxAttempts;
    this.TARGET_WORDS = targetWords;
    this.seed = seed ?? Date.now();
  }

  /** Generates a pseudo-random number between 0 and 1 using the current seed value. */
  private seededRandom(): number {
    this.seed = (this.seed * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;
    return this.seed / LCG_MODULUS;
  }

  /**
   * MAIN ENTRY POINT: Orchestrates the puzzle generation pipeline.
   * Decomposed into single-responsibility helper methods.
   */
  generate(rawEntries: Array<{ word: string; clue: string }>): IEngineResult & { unplacedWords: string[] } {
    const { sortedEntries, rejectedWords } = this.prepareEntries(rawEntries);
    
    if (sortedEntries.length === 0) {
      return { rows: 0, cols: 0, solution: [], placements: [], unplacedWords: rejectedWords };
    }

    const context = this.createPlacementContext();
    const placed = this.placeAnchorWord(context, sortedEntries);
    
    this.runPlacementLoop(context, sortedEntries, placed);
    
    return this.buildResult(context, placed, sortedEntries, rejectedWords);
  }

  /**
   * VALIDATION & NORMALIZATION: Single pass to clean, validate, and sort words.
   * Tracks ALL rejected words (including oversized) consistently.
   */
  private prepareEntries(rawEntries: Array<{ word: string; clue: string }>): {
    sortedEntries: Array<{ word: string; clue: string }>;
    rejectedWords: string[];
  } {
    const rejectedWords: string[] = [];
    const seen = new Set<string>();
    const validEntries: Array<{ word: string; clue: string }> = [];

    for (const entry of rawEntries) {
      const normalized = entry.word.toUpperCase().replace(/[^\p{L}]/gu, '');
      
      if (normalized.length < MIN_WORD_LENGTH || normalized.length > this.GRID_SIZE) {
        rejectedWords.push(normalized);
        continue;
      }
      if (seen.has(normalized)) continue; 
      
      seen.add(normalized);
      validEntries.push({ word: normalized, clue: entry.clue });
    }

    return { sortedEntries: this.sortEntriesStrategically(validEntries), rejectedWords };
  }

  /** Sorts words by length (longest first) then by common letter frequency to optimize intersection potential. */
  private sortEntriesStrategically(entries: Array<{ word: string; clue: string }>): Array<{ word: string; clue: string }> {
    const letterFrequency = new Map<string, number>();
    for (const entry of entries) {
      for (const letter of entry.word) {
        letterFrequency.set(letter, (letterFrequency.get(letter) || 0) + 1);
      }
    }

    return entries.sort((a, b) => {
      if (b.word.length !== a.word.length) return b.word.length - a.word.length;
      const aCommon = a.word.split('').filter(l => (letterFrequency.get(l) || 0) >= 2).length;
      const bCommon = b.word.split('').filter(l => (letterFrequency.get(l) || 0) >= 2).length;
      return bCommon - aCommon;
    });
  }

  /** Initializes an empty grid with tracking structures for the placement algorithm. */
  private createPlacementContext(): PlacementContext {
    return {
      grid: Array.from({ length: this.GRID_SIZE }, () => Array.from({ length: this.GRID_SIZE }, () => null)),
      letterIndex: new Map(),
      placedWordsSet: new Set(),
      gridSize: this.GRID_SIZE,
    };
  }

  /** Places the first (longest) word horizontally in the center of the grid as the anchor. */
  private placeAnchorWord(context: PlacementContext, entries: Array<{ word: string; clue: string }>): CandidatePlacement[] {
    const first = entries[0];
    const candidate: CandidatePlacement = {
      ...first,
      row: Math.floor(context.gridSize / 2),
      col: Math.floor((context.gridSize - first.word.length) / 2),
      direction: 'across',
    };

    context.grid = this.placeWordOnGrid(context.grid, candidate);
    context.placedWordsSet.add(first.word);
    context.letterIndex = this.buildLetterIndex(context.grid);

    return [candidate];
  }

  /** Iteratively attempts to place remaining words by finding valid intersections with already-placed words. */
  private runPlacementLoop(context: PlacementContext, entries: Array<{ word: string; clue: string }>, placed: CandidatePlacement[]): void {
    for (let attempt = 0; attempt < this.MAX_ATTEMPTS && placed.length < this.TARGET_WORDS; attempt++) {
      let placedAny = false;

      for (let i = 1; i < entries.length && placed.length < this.TARGET_WORDS; i++) {
        const entry = entries[i];
        if (context.placedWordsSet.has(entry.word)) continue;

        const candidates = this.findAllPlacements(context, entry, entries);
        if (candidates.length === 0) continue;

        const topCandidates = candidates.slice(0, Math.max(1, Math.ceil(candidates.length * TOP_CANDIDATE_RATIO)));
        const chosen = topCandidates[Math.floor(this.seededRandom() * topCandidates.length)];
        
        context.grid = this.placeWordOnGrid(context.grid, chosen);
        placed.push(chosen);
        context.placedWordsSet.add(chosen.word);
        context.letterIndex = this.buildLetterIndex(context.grid);
        placedAny = true;
      }

      if (!placedAny) break;
    }
  }

  /** Compiles the final result by trimming empty grid borders, adjusting coordinates, and assigning clue numbers. */
  private buildResult(
    context: PlacementContext, 
    placed: CandidatePlacement[], 
    validEntries: Array<{ word: string; clue: string }>, 
    rejectedWords: string[]
  ): IEngineResult & { unplacedWords: string[] } {
    const unplacedWords = [
      ...rejectedWords,
      ...validEntries.filter(e => !context.placedWordsSet.has(e.word)).map(e => e.word)
    ];

    const { trimmed, offsetRow, offsetCol } = this.trimGrid(context.grid);
    const adjustedPlacements = placed.map((p) => ({ ...p, row: p.row - offsetRow, col: p.col - offsetCol }));
    const numberedPlacements = this.assignClueNumbers(adjustedPlacements);

    return {
      rows: trimmed.length,
      cols: trimmed[0]?.length ?? 0,
      solution: trimmed,
      placements: numberedPlacements,
      unplacedWords,
    };
  }

  /**
   * CANDIDATE GENERATION: Uses context and candidate objects to maintain <= 3 parameters.
   */
  private findAllPlacements(
    context: PlacementContext,
    entry: { word: string; clue: string },
    allEntries: Array<{ word: string; clue: string }>
  ): CandidatePlacement[] {
    const candidates: CandidatePlacement[] = [];
    const checkedStarts = new Set<string>();

    for (let i = 0; i < entry.word.length; i++) {
      const letter = entry.word[i];
      const positions = context.letterIndex.get(letter) || [];
      
      for (const pos of positions) {
        const acrossCol = pos.c - i;
        const acrossKey = `a-${pos.r}-${acrossCol}`;
        if (acrossCol >= 0 && acrossCol + entry.word.length <= context.gridSize && !checkedStarts.has(acrossKey)) {
          const candidate = { ...entry, row: pos.r, col: acrossCol, direction: 'across' as Direction };
          if (this.canPlace(context, candidate)) {
            candidates.push(candidate);
            checkedStarts.add(acrossKey);
          }
        }

        const downRow = pos.r - i;
        const downKey = `d-${downRow}-${pos.c}`;
        if (downRow >= 0 && downRow + entry.word.length <= context.gridSize && !checkedStarts.has(downKey)) {
          const candidate = { ...entry, row: downRow, col: pos.c, direction: 'down' as Direction };
          if (this.canPlace(context, candidate)) {
            candidates.push(candidate);
            checkedStarts.add(downKey);
          }
        }
      }
    }

    for (const candidate of candidates) {
      candidate.score = this.scorePlacement(context, candidate, allEntries);
    }

    return candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  /** Validates whether a word can be legally placed at the specified position without violating crossword rules. */
  private canPlace(context: PlacementContext, candidate: CandidatePlacement): boolean {
    const { grid, gridSize } = context;
    const { word, row: startRow, col: startCol, direction } = candidate;
    const isAcross = direction === 'across';
    const len = word.length;

    if (isAcross) {
      if (startCol < 0 || startCol + len > gridSize || startRow < 0 || startRow >= gridSize) return false;
    } else {
      if (startRow < 0 || startRow + len > gridSize || startCol < 0 || startCol >= gridSize) return false;
    }

    const preRow = isAcross ? startRow : startRow - 1;
    const preCol = isAcross ? startCol - 1 : startCol;
    if (preRow >= 0 && preCol >= 0 && grid[preRow][preCol] !== null) return false;

    const postRow = isAcross ? startRow : startRow + len;
    const postCol = isAcross ? startCol + len : startCol;
    if (postRow < gridSize && postCol < gridSize && grid[postRow][postCol] !== null) return false;

    let hasIntersection = false;

    for (let i = 0; i < len; i++) {
      const r = isAcross ? startRow : startRow + i;
      const c = isAcross ? startCol + i : startCol;
      const cell = grid[r][c];

      if (cell === null) {
        if (isAcross) { 
          if (r > 0 && grid[r - 1][c] !== null) return false;
          if (r < gridSize - 1 && grid[r + 1][c] !== null) return false;
        } else {
          if (c > 0 && grid[r][c - 1] !== null) return false;
          if (c < gridSize - 1 && grid[r][c + 1] !== null) return false;
        }
      } else if (cell === word[i]) {
        hasIntersection = true;
      } else {
        return false;
      }
    }

    return hasIntersection;
  }

  /** Calculates a strategic score for a placement based on future potential, center proximity, and letter matches. */
  private scorePlacement(
    context: PlacementContext,
    candidate: CandidatePlacement,
    allEntries: Array<{ word: string; clue: string }>
  ): number {
    let score = 0;
    
    score += this.countFutureIntersections(context, candidate, allEntries) * FUTURE_INTERSECTION_WEIGHT;

    const distanceFromCenter = this.distanceFromCenter(candidate.row, candidate.col);
    const maxDistance = (context.gridSize / 2) * Math.SQRT2;
    score += Math.max(0, MAX_CENTER_BONUS - (distanceFromCenter / maxDistance) * MAX_CENTER_BONUS);

    score += this.countLetterMatches(context, candidate) * LETTER_MATCH_WEIGHT;

    return score;
  }

  /**
   * Estimates future intersections using a letter-presence heuristic.
   *
   * Counts a word as a potential future intersection if it shares at least one
   * letter with the candidate and that letter exists in the temporary grid.
   * It intentionally skips placement validation, making the estimate faster
   * but potentially optimistic.
   */
  private countFutureIntersections(
    context: PlacementContext,
    candidate: CandidatePlacement,
    allEntries: Array<{ word: string; clue: string }>
  ): number {
    let count = 0;
    const { word, row: startRow, col: startCol, direction } = candidate;
    const isAcross = direction === 'across';
    
    const tempGrid = context.grid.map((row) => [...row]);
    for (let i = 0; i < word.length; i++) {
      const r = isAcross ? startRow : startRow + i;
      const c = isAcross ? startCol + i : startCol;
      if (tempGrid[r][c] === null) tempGrid[r][c] = word[i];
    }

    const tempIndex = this.buildLetterIndex(tempGrid);

    for (const entry of allEntries) {
      if (entry.word === word || context.placedWordsSet.has(entry.word)) continue;

      const sharedLetters = new Set(word.split('').filter((letter) => entry.word.includes(letter)));
      if (sharedLetters.size > 0 && Array.from(sharedLetters).some(letter => tempIndex.has(letter))) {
        count++;
      }
    }

    return count;
  }

  /** Calculates the Euclidean distance from a grid position to the center point. */
  private distanceFromCenter(row: number, col: number): number {
    const center = this.GRID_SIZE / 2;
    return Math.sqrt(Math.pow(row - center, 2) + Math.pow(col - center, 2));
  }

  /** Counts how many letters in the candidate word match existing letters on the grid at the proposed position. */
  private countLetterMatches(context: PlacementContext, candidate: CandidatePlacement): number {
    let matches = 0;
    const { grid } = context;
    const { word, row: startRow, col: startCol, direction } = candidate;
    const isAcross = direction === 'across';
    
    for (let i = 0; i < word.length; i++) {
      const r = isAcross ? startRow : startRow + i;
      const c = isAcross ? startCol + i : startCol;
      if (grid[r][c] !== null && grid[r][c] === word[i]) matches++;
    }
    return matches;
  }

  /** Builds a spatial index mapping each letter to all grid positions where it appears for fast lookups. */
  private buildLetterIndex(grid: CrosswordCell[][]): Map<string, { r: number; c: number }[]> {
    const index = new Map<string, { r: number; c: number }[]>();
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (cell !== null) {
          if (!index.has(cell)) index.set(cell, []);
          index.get(cell)!.push({ r, c });
        }
      }
    }
    return index;
  }

  /** Writes a word into the grid immutably and returns a new grid reference with the placement. */
  private placeWordOnGrid(grid: CrosswordCell[][], candidate: CandidatePlacement): CrosswordCell[][] {
    const next = grid.map((r) => [...r]);
    const { word, row, col, direction } = candidate;
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      next[r][c] = word[i];
    }
    return next;
  }

  /** Removes empty border rows and columns from the grid to minimize the final output size. */
  private trimGrid(grid: CrosswordCell[][]): { trimmed: CrosswordCell[][]; offsetRow: number; offsetCol: number } {
    let minRow = grid.length, maxRow = -1;
    let minCol = grid[0]?.length ?? 0, maxCol = -1;
    
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

  /** Assigns sequential clue numbers (1, 2, 3...) to placements based on top-to-bottom, left-to-right order. */
  private assignClueNumbers(placements: CandidatePlacement[]): IEngineResult['placements'] {
    const sorted = [...placements].sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);
    const cellNumberMap = new Map<string, number>();
    let next = 1;

    for (const p of sorted) {
      const key = `${p.row},${p.col}`;
      if (!cellNumberMap.has(key)) cellNumberMap.set(key, next++);
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