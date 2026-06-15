import { CrosswordCell } from '../crossword.types';
import { CrosswordEngine, EngineResult } from './crossword-engine.interface';

type Direction = 'across' | 'down';

type CandidatePlacement = {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
  score?: number; // crossword-logic Addition: Placement quality score for smart greedy selection
};

/**
 * crossword-logic Addition: Advanced crossword engine with intersection-based placement
 * Uses greedy algorithm with seeded randomness to generate different puzzles each time
 */
export class HybridEngine implements CrosswordEngine {
  private readonly GRID_SIZE: number;
  private readonly MAX_ATTEMPTS: number;
  private readonly TARGET_WORDS: number;
  private seed: number;

  constructor(
    gridSize = 20,
    maxAttempts = 80,
    targetWords = 8,
  ) {
    this.GRID_SIZE = gridSize;
    this.MAX_ATTEMPTS = maxAttempts;
    this.TARGET_WORDS = targetWords;
    // Initialize seed with current timestamp for different puzzles each time
    this.seed = Date.now();
  }

  /**
   * crossword-logic Addition: Seeded random number generator
   * Uses Linear Congruential Generator (LCG) algorithm for reproducible randomness
   */
  private seededRandom(): number {
    // LCG formula: seed = (a * seed + c) % m
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  /**
   * crossword-logic Addition: Main puzzle generation algorithm
   * 1. Places first word in center horizontally
   * 2. Iteratively finds intersections with existing words
   * 3. Places new words at valid intersection points
   * 4. Falls back to non-intersecting placement if needed
   */
  generate(rawEntries: Array<{ word: string; clue: string }>): EngineResult {
    // Normalize and shuffle words with seeded randomness
    const entries = this.normaliseAndShuffle(rawEntries);
    
    // Return empty result if no valid words provided
    if (entries.length === 0) {
      return { rows: 0, cols: 0, solution: [], placements: [] };
    }

    // Initialize empty grid
    let grid = this.createEmptyGrid(this.GRID_SIZE);
    const placed: CandidatePlacement[] = [];

    // Place first word horizontally in center of grid
    const first = entries[0];
    const startRow = Math.floor(this.GRID_SIZE / 2);
    const startCol = Math.floor((this.GRID_SIZE - first.word.length) / 2);
    grid = this.placeWord(grid, first.word, startRow, startCol, 'across');
    placed.push({ ...first, row: startRow, col: startCol, direction: 'across' });

    // Attempt to place remaining words with intersection constraints
    for (
      let attempt = 0;
      attempt < this.MAX_ATTEMPTS && placed.length < this.TARGET_WORDS;
      attempt++
    ) {
      let placedAny = false;

      for (let i = 1; i < entries.length && placed.length < this.TARGET_WORDS; i++) {
        const entry = entries[i];
        // Skip if word already placed
        if (placed.some((p) => p.word === entry.word)) continue;

        // crossword-logic Addition: Pass all entries for smart scoring
        // Find all valid placements with intersections and strategic scores
        const candidates = this.findAllPlacements(grid, entry, entries);
        if (candidates.length === 0) continue;

        // crossword-logic Addition: Pick from top-scored candidates (not purely random)
        // Select from top 30% of candidates to balance quality with randomness
        const topCandidates = candidates.slice(0, Math.max(1, Math.ceil(candidates.length * 0.3)));
        const chosen = topCandidates[Math.floor(this.seededRandom() * topCandidates.length)];
        
        grid = this.placeWord(grid, entry.word, chosen.row, chosen.col, chosen.direction);
        placed.push(chosen);
        placedAny = true;
      }

      if (!placedAny) break;
    }

    // Validate we have at least some words placed
    if (placed.length < 2) {
      // Fallback: place second word vertically below first if intersection-based placement failed
      if (entries.length > 1 && placed.length === 1) {
        const second = entries[1];
        const firstPos = placed[0];
        const vertRow = firstPos.row + 2;
        const vertCol = firstPos.col;
        if (this.canPlaceFallback(grid, second.word, vertRow, vertCol, 'down')) {
          grid = this.placeWord(grid, second.word, vertRow, vertCol, 'down');
          placed.push({ ...second, row: vertRow, col: vertCol, direction: 'down' });
        }
      }
    }

    const { trimmed, offsetRow, offsetCol } = this.trimGrid(grid);
    const adjustedPlacements = placed.map((p) => ({
      ...p,
      row: p.row - offsetRow,
      col: p.col - offsetCol,
    }));

    const numberedPlacements = this.assignClueNumbers(adjustedPlacements);

    return {
      rows: trimmed.length,
      cols: trimmed[0]?.length ?? 0,
      solution: trimmed,
      placements: numberedPlacements,
    };
  }

  /**
   * crossword-logic Addition: Find all valid placements for a word with intelligent scoring
   * Scans grid for existing letters that match word letters
   * Scores each placement based on strategic value (intersections, position, future potential)
   * Returns array sorted by score descending (best placements first)
   */
  private findAllPlacements(
    grid: CrosswordCell[][],
    entry: { word: string; clue: string },
    allEntries?: Array<{ word: string; clue: string }>,
  ): CandidatePlacement[] {
    const candidates: CandidatePlacement[] = [];
    const size = grid.length;

    // Scan entire grid for potential intersection points
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = grid[r][c];
        if (cell === null) continue;

        // Check each letter position in the word for potential match
        for (let i = 0; i < entry.word.length; i++) {
          if (entry.word[i] !== cell) continue;

          // Try placing word horizontally (across)
          const acrossCol = c - i;
          if (acrossCol >= 0 && this.canPlace(grid, entry.word, r, acrossCol, 'across')) {
            candidates.push({ ...entry, row: r, col: acrossCol, direction: 'across' });
          }

          // Try placing word vertically (down)
          const downRow = r - i;
          if (downRow >= 0 && this.canPlace(grid, entry.word, downRow, c, 'down')) {
            candidates.push({ ...entry, row: downRow, col: c, direction: 'down' });
          }
        }
      }
    }

    // crossword-logic Addition: Score each candidate placement for smart greedy selection
    // Higher scores indicate better strategic placements
    if (allEntries) {
      for (const candidate of candidates) {
        candidate.score = this.scorePlacement(grid, candidate, allEntries);
      }
      // Sort by score descending - best placements first
      candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    return candidates;
  }

  private canPlace(
    grid: CrosswordCell[][],
    word: string,
    startRow: number,
    startCol: number,
    direction: Direction,
  ): boolean {
    const size = grid.length;
    const isAcross = direction === 'across';
    const len = word.length;

    // Boundary checks
    if (isAcross) {
      if (startCol < 0 || startCol + len > size || startRow < 0 || startRow >= size) return false;
    } else {
      if (startRow < 0 || startRow + len > size || startCol < 0 || startCol >= size) return false;
    }

    const preRow = isAcross ? startRow : startRow - 1;
    const preCol = isAcross ? startCol - 1 : startCol;
    if (preRow >= 0 && preCol >= 0 && grid[preRow][preCol] !== null) return false;

    const postRow = isAcross ? startRow : startRow + len;
    const postCol = isAcross ? startCol + len : startCol;
    if (postRow < size && postCol < size && grid[postRow][postCol] !== null) return false;

    let hasIntersection = false;

    for (let i = 0; i < len; i++) {
      const r = isAcross ? startRow : startRow + i;
      const c = isAcross ? startCol + i : startCol;
      const cell = grid[r][c];

      if (cell === null) {
        if (isAcross) {
          if (r > 0 && grid[r - 1][c] !== null) return false;
          if (r < size - 1 && grid[r + 1][c] !== null) return false;
        } else {
          if (c > 0 && grid[r][c - 1] !== null) return false;
          if (c < size - 1 && grid[r][c + 1] !== null) return false;
        }
      } else if (cell === word[i]) {
        hasIntersection = true;
      } else {
        return false;
      }
    }

    return hasIntersection;
  }

  /**
   * crossword-logic Addition: Score a placement based on strategic value
   * Higher scores = better placements
   * Factors: future intersection potential, center proximity, letter match count
   */
  private scorePlacement(
    grid: CrosswordCell[][],
    candidate: CandidatePlacement,
    allEntries: Array<{ word: string; clue: string }>,
  ): number {
    let score = 0;

    // BONUS 1: Placements that enable more future intersections (10 points each)
    // This helps create denser, more interconnected puzzles
    const futureIntersections = this.countFutureIntersections(
      grid,
      candidate.word,
      candidate.row,
      candidate.col,
      candidate.direction,
      allEntries,
    );
    score += futureIntersections * 10;

    // BONUS 2: Placements closer to center create more compact layouts (max 10 points)
    // Distance from center: 0 (center) to sqrt(2)*GRID_SIZE/2 (corner)
    const distanceFromCenter = this.distanceFromCenter(candidate.row, candidate.col);
    const maxDistance = (this.GRID_SIZE / 2) * Math.SQRT2;
    const centerBonus = Math.max(0, 10 - (distanceFromCenter / maxDistance) * 10);
    score += centerBonus;

    // BONUS 3: More letter matches = more intersections with existing words (5 points each)
    // This creates tighter, more professional-looking grids
    const letterMatches = this.countLetterMatches(
      grid,
      candidate.word,
      candidate.row,
      candidate.col,
      candidate.direction,
    );
    score += letterMatches * 5;

    return score;
  }

  /**
   * crossword-logic Addition: Count how many future words can intersect at this placement
   * Looks at unplaced words and checks if they share letters with candidate word
   * Higher count means this placement "unlocks" more future possibilities
   */
  private countFutureIntersections(
    grid: CrosswordCell[][],
    word: string,
    startRow: number,
    startCol: number,
    direction: Direction,
    allEntries: Array<{ word: string; clue: string }>,
  ): number {
    let count = 0;
    const isAcross = direction === 'across';

    // Create temporary grid with this word placed
    const tempGrid = grid.map((row) => [...row]);
    for (let i = 0; i < word.length; i++) {
      const r = isAcross ? startRow : startRow + i;
      const c = isAcross ? startCol + i : startCol;
      if (tempGrid[r][c] === null) {
        tempGrid[r][c] = word[i];
      }
    }

    // Check each unplaced word for potential intersections
    for (const entry of allEntries) {
      if (entry.word === word) continue; // Skip self

      // Quick check: do words share any letters?
      const sharedLetters = new Set(
        word.split('').filter((letter) => entry.word.includes(letter)),
      );

      // If they share letters, they could potentially intersect
      if (sharedLetters.size > 0) {
        // Count how many valid placements exist for this word on temp grid
        const placements = this.findAllPlacements(tempGrid, entry);
        if (placements.length > 0) {
          count++;
        }
      }
    }

    return count;
  }

  /**
   * crossword-logic Addition: Calculate Euclidean distance from grid center
   * Used to favor placements near center for compact, professional-looking layouts
   */
  private distanceFromCenter(row: number, col: number): number {
    const centerRow = this.GRID_SIZE / 2;
    const centerCol = this.GRID_SIZE / 2;
    const deltaRow = row - centerRow;
    const deltaCol = col - centerCol;
    return Math.sqrt(deltaRow * deltaRow + deltaCol * deltaCol);
  }

  /**
   * crossword-logic Addition: Count number of letter matches with existing grid
   * More matches = more intersections = denser puzzle
   */
  private countLetterMatches(
    grid: CrosswordCell[][],
    word: string,
    startRow: number,
    startCol: number,
    direction: Direction,
  ): number {
    let matches = 0;
    const isAcross = direction === 'across';

    for (let i = 0; i < word.length; i++) {
      const r = isAcross ? startRow : startRow + i;
      const c = isAcross ? startCol + i : startCol;
      const cell = grid[r][c];

      // Count cells where word letter matches existing grid letter
      if (cell !== null && cell === word[i]) {
        matches++;
      }
    }

    return matches;
  }

  // Fallback placement for words that don't intersect via standard method
  private canPlaceFallback(
    grid: CrosswordCell[][],
    word: string,
    startRow: number,
    startCol: number,
    direction: Direction,
  ): boolean {
    const size = grid.length;
    const isAcross = direction === 'across';
    const len = word.length;

    // Only allow if grid cell is empty
    if (isAcross) {
      if (startCol < 0 || startCol + len > size || startRow < 0 || startRow >= size) return false;
    } else {
      if (startRow < 0 || startRow + len > size || startCol < 0 || startCol >= size) return false;
    }

    // Check all cells in path are empty
    for (let i = 0; i < len; i++) {
      const r = isAcross ? startRow : startRow + i;
      const c = isAcross ? startCol + i : startCol;
      if (grid[r][c] !== null) return false;
    }

    return true;
  }

  private createEmptyGrid(size: number): CrosswordCell[][] {
    return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
  }

  private placeWord(
    grid: CrosswordCell[][],
    word: string,
    row: number,
    col: number,
    direction: Direction,
  ): CrosswordCell[][] {
    const next = grid.map((r) => [...r]);
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row : row + i;
      const c = direction === 'across' ? col + i : col;
      next[r][c] = word[i];
    }
    return next;
  }

  private trimGrid(grid: CrosswordCell[][]): {
    trimmed: CrosswordCell[][];
    offsetRow: number;
    offsetCol: number;
  } {
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

  private assignClueNumbers(
    placements: CandidatePlacement[],
  ): EngineResult['placements'] {
    const sorted = [...placements].sort((a, b) =>
      a.row !== b.row ? a.row - b.row : a.col - b.col,
    );

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

  /**
   * crossword-logic Addition: Normalize and strategically order words with seeded randomness
   * 1. Converts to uppercase and preserves Unicode letters (umlauts, accents)
   * 2. Filters duplicates and single-letter words
   * 3. Sorts by strategic criteria (length, common letters)
   * 4. Shuffles with seeded random for different arrangements each time
   * Supports multilingual: German (Ä, Ö, Ü, ß), French (é, è, ê, ç), etc.
   */
  private normaliseAndShuffle(
    raw: Array<{ word: string; clue: string }>,
  ): Array<{ word: string; clue: string }> {
    const seen = new Set<string>();
    
    // Filter and normalize word entries
    // Unicode regex \p{L} preserves letters from any language
    let entries = raw
      .map((e) => {
        // Keep only Unicode letters (supports accents, umlauts)
        const normalized = e.word.toUpperCase().replace(/[^\p{L}]/gu, '');
        return { word: normalized, clue: e.clue };
      })
      .filter((e) => {
        // Reject single letters and duplicates
        if (e.word.length <= 1 || seen.has(e.word)) return false;
        seen.add(e.word);
        return true;
      });

    // crossword-logic Addition: Calculate letter frequency across all words
    // Words with common letters are easier to intersect
    const letterFrequency = new Map<string, number>();
    for (const entry of entries) {
      for (const letter of entry.word) {
        letterFrequency.set(letter, (letterFrequency.get(letter) || 0) + 1);
      }
    }

    // crossword-logic Addition: Strategic sorting for better puzzle generation
    entries.sort((a, b) => {
      // Priority 1: Longer words first (more placement flexibility)
      if (b.word.length !== a.word.length) {
        return b.word.length - a.word.length;
      }

      // Priority 2: Words with more common letters (easier to intersect)
      const aCommonLetters = a.word
        .split('')
        .filter((letter) => (letterFrequency.get(letter) || 0) >= 2).length;
      const bCommonLetters = b.word
        .split('')
        .filter((letter) => (letterFrequency.get(letter) || 0) >= 2).length;
      
      return bCommonLetters - aCommonLetters;
    });

    // Fisher-Yates shuffle with seeded random
    for (let i = entries.length - 1; i > 0; i--) {
      const j = Math.floor(this.seededRandom() * (i + 1));
      [entries[i], entries[j]] = [entries[j], entries[i]];
    }

    return entries;
  }
}
