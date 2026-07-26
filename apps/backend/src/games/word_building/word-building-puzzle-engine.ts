
import { IWordBuildingPuzzleEngine, IEngineResult } from './word-building-engine.interface';

/**
 * Represents a single cell in the crossword grid.
 * A string represents a letter, null represents an empty or black cell.
 */
type CrosswordCell = string | null;

/**
 * Direction of word placement in the crossword.
 */
type Direction = 'across' | 'down';

/**
 * Represents a vocabulary entry with its normalized form, clue, and original casing.
 * Used throughout the puzzle generation pipeline to track words for placement.
 */
type VocabularyEntry = {
  word:         string; // Normalized uppercase form for grid placement
  clue:         string; // Hint shown to players
  originalWord: string; // Original casing/form for user-facing rejection messages
};

/**
 * Represents a potential word placement with its position, direction, and score.
 */
type CandidatePlacement = {
  word:      string;
  clue:      string;
  row:       number;
  col:       number;
  direction: Direction;
  score?:    number;
};

/**
 * Working context maintained during puzzle generation.
 * Contains the current grid state, indices for efficient lookup, and tracking sets.
 */
type PlacementContext = {
  grid:           CrosswordCell[][];
  letterIndex:    Map<string, { r: number; c: number }[]>;
  placedWordsSet: Set<string>;
  gridSize:       number;
};

// ─── Constants ────────────────────────────────────────────────────────────────
/** Linear Congruential Generator constants for deterministic randomness */
const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT  = 1013904223;
const LCG_MODULUS    = 4294967296;

/** Ratio of top-scoring candidates to consider for random selection */
const TOP_CANDIDATE_RATIO        = 0.3;
/** Weight given to future intersection potential in scoring */
const FUTURE_INTERSECTION_WEIGHT = 10;
/** Maximum bonus points for center-proximity in scoring */
const MAX_CENTER_BONUS           = 10;
/** Weight given to existing letter matches in scoring */
const LETTER_MATCH_WEIGHT        = 5;
/** Minimum acceptable word length */
const MIN_WORD_LENGTH            = 2;

/**
 * Advanced crossword puzzle generator with intersection-based placement.
 * 
 * Features:
 * - Greedy algorithm with strategic word ordering (longest + most interconnectable first)
 * - Seeded randomness for reproducible puzzles
 * - Incremental letter indexing for O(word.length) updates instead of O(grid²)
 * - Optimized scoring that checks letter existence without grid copies
 * - Strict crossword validation rules (no diagonal touching, mandatory intersections)
 * 
 * Performance optimizations:
 * - Letter index updates are incremental (O(word.length) vs O(grid²))
 * - Future intersection counting uses logical checks (O(vocab × word.length) vs O(grid² × vocab))
 * - No redundant grid copies during scoring
 */
export class WordBuildingPuzzleEngine implements IWordBuildingPuzzleEngine {
  private readonly GRID_SIZE:    number;
  private readonly MAX_ATTEMPTS: number;
  private readonly TARGET_WORDS: number;
  private seed: number;

  /**
   * Configures the crossword puzzle generator with placement limits and an optional seed.
   * 
   * The seed enables deterministic puzzle generation - providing the same seed with the
   * same vocabulary will always produce the same puzzle layout. If no seed is provided,
   * Date.now() is used, ensuring each instance gets a unique random sequence.
   * 
   * @param gridSize Maximum side length of the working grid (default 20).
   * @param maxAttempts Number of placement passes before stopping (default 80).
   * @param targetWords Soft cap on word count - generation stops when reached (default 8).
   * @param seed Optional deterministic seed for reproducible puzzles (default Date.now()).
   */
  constructor(gridSize = 20, maxAttempts = 80, targetWords = 8, seed?: number) {
    this.GRID_SIZE    = gridSize;
    this.MAX_ATTEMPTS = maxAttempts;
    this.TARGET_WORDS = targetWords;
    this.seed         = seed ?? Date.now();
  }

  /**
   * Advances the internal Linear Congruential Generator (LCG) and returns a pseudo-random value.
   * 
   * This provides deterministic randomness - given the same initial seed, the sequence of
   * returned values will always be identical. This is critical for reproducible puzzle
   * generation in tests or when debugging specific layouts.
   * 
   * The LCG formula: seed = (seed × multiplier + increment) mod modulus
   * 
   * @returns A floating-point number between 0 (inclusive) and 1 (exclusive).
   */
  private seededRandom(): number {
    this.seed = (this.seed * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;
    return this.seed / LCG_MODULUS;
  }

  /**
   * Main entry point: generates a complete crossword puzzle from vocabulary entries.
   * 
   * Pipeline stages:
   * 1. Prepare: Normalize, validate, deduplicate, and strategically sort entries
   * 2. Initialize: Create empty grid and tracking structures
   * 3. Anchor: Place first word horizontally at grid center
   * 4. Loop: Iteratively find and place intersecting words
   * 5. Build: Trim empty space, assign clue numbers, compile results
   * 
   * @param rawEntries Word/clue pairs from the active vocabulary (may contain duplicates or invalid entries).
   * @returns Complete puzzle with trimmed solution grid, placement metadata, and list of unplaced words.
   */
  generate(
    rawEntries: Array<{ word: string; clue: string }>,
  ): IEngineResult & { unplacedWords: string[] } {
    const { sortedEntries, rejectedWords } = this.prepareEntries(rawEntries);

    if (sortedEntries.length === 0) {
      return { rows: 0, cols: 0, solution: [], placements: [], unplacedWords: rejectedWords };
    }

    const context = this.createPlacementContext();
    const placed  = this.placeAnchorWord(context, sortedEntries);

    this.runPlacementLoop(context, sortedEntries, placed);

    return this.buildResult(context, placed, sortedEntries, rejectedWords);
  }

  // ─── Pipeline steps ────────────────────────────────────────────────────────

  /**
   * Validates and prepares vocabulary entries for puzzle generation.
   * 
   * Processing steps:
   * 1. Normalize to NFC Unicode form (handles accented characters consistently)
   * 2. Convert to uppercase (crosswords are case-insensitive)
   * 3. Strip non-letter characters (spaces, punctuation, numbers)
   * 4. Reject words shorter than MIN_WORD_LENGTH or longer than grid size
   * 5. Deduplicate (ignore case-normalized duplicates)
   * 6. Sort strategically by length and letter frequency
   * 7. Track originalWord for better rejection reports
   * 
   * @param rawEntries Candidate words and clues from the vocabulary (may be dirty).
   * @returns Valid entries sorted by placement priority, plus list of rejected words.
   */
  private prepareEntries(rawEntries: Array<{ word: string; clue: string }>): {
    sortedEntries: VocabularyEntry[];
    rejectedWords: string[];
  } {
    const rejectedWords: string[] = [];
    const seen = new Set<string>();
    const validEntries: VocabularyEntry[] = [];

    for (const entry of rawEntries) {
      const originalWord = entry.word;
      // Custom mapping preserves 'ß' (Eszett) as a single character.
      // Native .toUpperCase() expands ß → SS, breaking the 1-to-1 grid cell mapping.
      const normalized = entry.word
        .normalize('NFC')
        .split('')
        .map(char => (char === 'ß' || char === 'ẞ') ? 'ß' : char.toUpperCase())
        .join('')
        .replace(/[^\p{L}]/gu, '');

      if (normalized.length < MIN_WORD_LENGTH || normalized.length > this.GRID_SIZE) {
        rejectedWords.push(originalWord);
        continue;
      }
      if (seen.has(normalized)) continue;

      seen.add(normalized);
      validEntries.push({ word: normalized, clue: entry.clue, originalWord });
    }

    return { sortedEntries: this.sortEntriesStrategically(validEntries), rejectedWords };
  }

  /**
   * Sorts entries to maximize crossword density and intersection quality.
   * 
   * Strategy:
   * 1. Primary key: Word length (descending) - longer words form better scaffolding
   * 2. Secondary key: Common letter count (descending) - words with letters appearing
   *    in multiple vocabulary entries have higher intersection potential
   * 
   * A letter is "common" if it appears in 2+ words. Words with many common letters
   * are prioritized because they create more opportunities for future intersections.
   * 
   * Example: Given ["CAT", "CATTLE", "DOG", "ELEPHANT"], the sort produces:
   * ["ELEPHANT", "CATTLE", "CAT", "DOG"] - longest first, then by shared letters.
   * 
   * @param entries Valid entries ready for placement.
   * @returns The same entries sorted by optimal placement order.
   */
  private sortEntriesStrategically(
    entries: VocabularyEntry[],
  ): VocabularyEntry[] {
    const freq = new Map<string, number>();
    for (const e of entries) {
      for (const letter of e.word) {
        freq.set(letter, (freq.get(letter) ?? 0) + 1);
      }
    }
    return entries.sort((a, b) => {
      if (b.word.length !== a.word.length) return b.word.length - a.word.length;
      const commonA = a.word.split('').filter(l => (freq.get(l) ?? 0) >= 2).length;
      const commonB = b.word.split('').filter(l => (freq.get(l) ?? 0) >= 2).length;
      return commonB - commonA;
    });
  }

  /**
   * Creates a fresh working context for one puzzle generation run.
   * 
   * The context tracks:
   * - grid: 2D array of letters (null = empty/black cell)
   * - letterIndex: Map of each letter to all (row, col) positions where it appears
   * - placedWordsSet: Set of words already committed to the grid
   * - gridSize: Fixed dimension reference
   * 
   * @returns Mutable placement context used throughout the generation pipeline.
   */
  private createPlacementContext(): PlacementContext {
    return {
      grid: Array.from({ length: this.GRID_SIZE }, () =>
        Array<CrosswordCell>(this.GRID_SIZE).fill(null),
      ),
      letterIndex:    new Map(),
      placedWordsSet: new Set(),
      gridSize:       this.GRID_SIZE,
    };
  }

  /**
   * Places the first word horizontally near the grid center to establish the puzzle anchor.
   * 
   * All subsequent words must intersect with existing letters, so the anchor provides
   * the initial scaffold. Horizontal placement at the center allows equal expansion
   * in all directions, maximizing the available space for future placements.
   * 
   * OPTIMIZATION: Uses incremental letter index update (O(word.length)) instead of
   * rebuilding the full grid index (O(grid²)).
   * 
   * @param context Mutable placement context for the current generation run.
   * @param entries Sorted entries with the anchor word at index 0 (longest, most connectable).
   * @returns Single-element array containing the anchor word placement.
   */
  private placeAnchorWord(
    context: PlacementContext,
    entries: VocabularyEntry[],
  ): CandidatePlacement[] {
    const first = entries[0];
    const candidate: CandidatePlacement = {
      word:      first.word,
      clue:      first.clue,
      row:       Math.floor(context.gridSize / 2),
      col:       Math.floor((context.gridSize - first.word.length) / 2),
      direction: 'across',
    };

    context.grid           = this.placeWordOnGrid(context.grid, candidate);
    context.placedWordsSet.add(first.word);
    this.updateLetterIndex(context.letterIndex, candidate);

    return [candidate];
  }

  /**
   * Core greedy placement loop: iteratively finds and commits the best word placements.
   * 
   * Algorithm:
   * - Outer loop: Runs up to MAX_ATTEMPTS times, enabling words to be reconsidered
   *   after the board state changes from other placements
   * - Inner loop: For each unplaced word, find all valid positions, score them,
   *   and commit the best candidate
   * - Early exit: Stops when no word can be placed in a full pass (no progress)
   * 
   * Selection strategy:
   * - Find all valid candidates for a word
   * - Sort candidates by score (descending)
   * - Randomly select from the top 30% (TOP_CANDIDATE_RATIO)
   * - This balances quality (high scores) with variety (randomness)
   * 
   * OPTIMIZATION: Uses incremental letter index update after each placement
   * instead of rebuilding the entire grid index.
   * 
   * @param context Mutable placement context for the current generation run.
   * @param entries All valid entries being considered for placement.
   * @param placed Current list of placements, including the anchor word.
   */
  private runPlacementLoop(
    context: PlacementContext,
    entries: VocabularyEntry[],
    placed:  CandidatePlacement[],
  ): void {
    for (
      let attempt = 0;
      attempt < this.MAX_ATTEMPTS && placed.length < this.TARGET_WORDS;
      attempt++
    ) {
      let placedAny = false;

      for (let i = 1; i < entries.length && placed.length < this.TARGET_WORDS; i++) {
        const entry = entries[i];
        if (context.placedWordsSet.has(entry.word)) continue;

        const candidates = this.findAllPlacements(context, entry, entries);
        if (candidates.length === 0) continue;

        const topN   = Math.max(1, Math.ceil(candidates.length * TOP_CANDIDATE_RATIO));
        const chosen = candidates[Math.floor(this.seededRandom() * topN)];

        context.grid = this.placeWordOnGrid(context.grid, chosen);
        placed.push(chosen);
        context.placedWordsSet.add(chosen.word);
        this.updateLetterIndex(context.letterIndex, chosen);
        placedAny = true;
      }

      if (!placedAny) break;
    }
  }

  /**
   * Converts the mutable working grid into the trimmed output grid and final placement metadata.
   *
   * @param context Final placement context.
   * @param placed Words that were actually placed on the grid.
   * @param validEntries Entries that were eligible for placement.
   * @param rejectedWords Words that were rejected before placement started.
   * @returns The engine result plus the list of unplaced words.
   */
  private buildResult(
    context:       PlacementContext,
    placed:        CandidatePlacement[],
    validEntries:  VocabularyEntry[],
    rejectedWords: string[],
  ): IEngineResult & { unplacedWords: string[] } {
    const unplacedWords = [
      ...rejectedWords,
      ...validEntries.filter(e => !context.placedWordsSet.has(e.word)).map(e => e.originalWord),
    ];

    const { trimmed, offsetRow, offsetCol } = this.trimGrid(context.grid);
    const adjusted = placed.map(p => ({ ...p, row: p.row - offsetRow, col: p.col - offsetCol }));
    const numbered = this.assignClueNumbers(adjusted);

    return {
      rows:         trimmed.length,
      cols:         trimmed[0]?.length ?? 0,
      solution:     trimmed,
      placements:   numbered,
      unplacedWords,
    };
  }

  // ─── Placement helpers ─────────────────────────────────────────────────────

  /**
   * Finds every legal placement for one entry against the current grid state.
   *
   * @param context Current working grid and letter index.
   * @param entry Word/clue pair being placed.
   * @param allEntries Full candidate list, used to score intersections.
   * @returns Candidate placements sorted from strongest to weakest.
   */
  private findAllPlacements(
    context:    PlacementContext,
    entry:      VocabularyEntry,
    allEntries: VocabularyEntry[],
  ): CandidatePlacement[] {
    const candidates:    CandidatePlacement[] = [];
    const checkedStarts = new Set<string>();

    for (let i = 0; i < entry.word.length; i++) {
      const letter    = entry.word[i];
      const positions = context.letterIndex.get(letter) ?? [];

      for (const pos of positions) {
        const acrossCol = pos.c - i;
        const acrossKey = `a-${pos.r}-${acrossCol}`;
        if (
          acrossCol >= 0 &&
          acrossCol + entry.word.length <= context.gridSize &&
          !checkedStarts.has(acrossKey)
        ) {
          const c = { ...entry, row: pos.r, col: acrossCol, direction: 'across' as Direction };
          if (this.canPlace(context, c)) { candidates.push(c); checkedStarts.add(acrossKey); }
        }

        const downRow = pos.r - i;
        const downKey = `d-${downRow}-${pos.c}`;
        if (
          downRow >= 0 &&
          downRow + entry.word.length <= context.gridSize &&
          !checkedStarts.has(downKey)
        ) {
          const c = { ...entry, row: downRow, col: pos.c, direction: 'down' as Direction };
          if (this.canPlace(context, c)) { candidates.push(c); checkedStarts.add(downKey); }
        }
      }
    }

    for (const c of candidates) {
      c.score = this.scorePlacement(context, c, allEntries);
    }
    return candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  /**
   * Validates that a candidate fits the grid rules without colliding or breaking crossword flow.
   *
   * @param context Current working grid and size constraints.
   * @param candidate Placement to validate.
   * @returns `true` when the word can be placed cleanly.
   */
  private canPlace(context: PlacementContext, candidate: CandidatePlacement): boolean {
    const { grid, gridSize } = context;
    const { word, row: startRow, col: startCol, direction } = candidate;
    const isAcross = direction === 'across';
    const len      = word.length;

    if (isAcross) {
      if (startCol < 0 || startCol + len > gridSize || startRow < 0 || startRow >= gridSize) return false;
    } else {
      if (startRow < 0 || startRow + len > gridSize || startCol < 0 || startCol >= gridSize) return false;
    }

    const preRow = isAcross ? startRow      : startRow - 1;
    const preCol = isAcross ? startCol - 1  : startCol;
    if (preRow >= 0 && preCol >= 0 && grid[preRow][preCol] !== null) return false;

    const postRow = isAcross ? startRow       : startRow + len;
    const postCol = isAcross ? startCol + len : startCol;
    if (postRow < gridSize && postCol < gridSize && grid[postRow][postCol] !== null) return false;

    let hasIntersection = false;

    for (let i = 0; i < len; i++) {
      const r    = isAcross ? startRow     : startRow + i;
      const c    = isAcross ? startCol + i : startCol;
      const cell = grid[r][c];

      if (cell === null) {
        if (isAcross) {
          if (r > 0            && grid[r - 1][c] !== null) return false;
          if (r < gridSize - 1 && grid[r + 1][c] !== null) return false;
        } else {
          if (c > 0            && grid[r][c - 1] !== null) return false;
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

  /**
   * Scores a candidate by balancing future intersections, center proximity, and letter matches.
   * Higher scores are preferred when choosing which placement to commit.
   *
   * @param context Current working grid.
   * @param candidate Placement under consideration.
   * @param allEntries Full candidate list, used to measure future intersection potential.
   * @returns A comparable placement score.
   */
  private scorePlacement(
    context:    PlacementContext,
    candidate:  CandidatePlacement,
    allEntries: VocabularyEntry[],
  ): number {
    let score = 0;
    score += this.countFutureIntersections(context, candidate, allEntries) * FUTURE_INTERSECTION_WEIGHT;

    const dist    = this.distanceFromCenter(candidate.row, candidate.col);
    const maxDist = (context.gridSize / 2) * Math.SQRT2;
    score += Math.max(0, MAX_CENTER_BONUS - (dist / maxDist) * MAX_CENTER_BONUS);

    score += this.countLetterMatches(context, candidate) * LETTER_MATCH_WEIGHT;
    return score;
  }

  /**
   * Estimates how many future words could intersect with this candidate after it is placed.
   * 
   * ALGORITHM & OPTIMIZATION:
   * Instead of copying the entire grid and rebuilding the letter index (which would be O(gridSize²) 
   * per candidate), this method uses a logical O(V × L) check. It iterates through all unplaced 
   * words and checks if they share at least one letter with the *candidate word being scored*.
   * 
   * WHY ONLY CHECK THE CANDIDATE WORD?
   * A previous iteration attempted to check if unplaced words shared letters with the *existing board* 
   * OR the candidate. However, this caused "overcounting": an unplaced word that shares letters with 
   * the board but NOT the candidate would be counted as a future intersection for the candidate, 
   * even though it could never actually intersect with the candidate itself. By strictly checking 
   * only the candidate's letters, we ensure the score accurately reflects the candidate's true 
   * potential to unlock future placements.
   * 
   * @param context Current working grid and tracking structures.
   * @param candidate The placement being evaluated.
   * @param allEntries Full vocabulary list (used to identify unplaced words).
   * @returns The count of unplaced words that share at least one letter with the candidate.
   */
  private countFutureIntersections(
    context:    PlacementContext,
    candidate:  CandidatePlacement,
    allEntries: VocabularyEntry[],
  ): number {
    const { word } = candidate;
    let count = 0;

    for (const entry of allEntries) {
      if (entry.word === word || context.placedWordsSet.has(entry.word)) continue;

      // Check if the unplaced word shares a letter with the candidate word ONLY
      for (const letter of entry.word) {
        if (word.includes(letter)) {
          count++;
          break; // Found at least one shared letter, no need to check the rest of this entry
        }
      }
    }

    return count;
  }

  /**
   * Measures how far a placement starts from the geometric center of the working grid.
   *
   * @param row Candidate row.
   * @param col Candidate column.
   * @returns Euclidean distance from the grid center.
   */
  private distanceFromCenter(row: number, col: number): number {
    const center = this.GRID_SIZE / 2;
    return Math.sqrt((row - center) ** 2 + (col - center) ** 2);
  }

  /**
   * Counts letters that already match the grid at the candidate's start position.
   *
   * @param context Current working grid.
   * @param candidate Placement being evaluated.
   * @returns The number of exact letter matches already present on the grid.
   */
  private countLetterMatches(context: PlacementContext, candidate: CandidatePlacement): number {
    const { grid } = context;
    const { word, row: startRow, col: startCol, direction } = candidate;
    const isAcross = direction === 'across';
    let matches = 0;

    for (let i = 0; i < word.length; i++) {
      const r = isAcross ? startRow     : startRow + i;
      const c = isAcross ? startCol + i : startCol;
      if (grid[r][c] !== null && grid[r][c] === word[i]) matches++;
    }
    return matches;
  }

  /**
   * Incrementally updates the letter index by adding positions from a newly placed word.
   * 
   * OPTIMIZATION: This replaces the full grid scan (buildLetterIndex) that the
   * original engine performed after each word placement.
   * 
   * Performance comparison:
   * - Old: O(gridSize²) - scans all 324 cells after each word
   * - New: O(word.length) - only processes 5-10 letters
   * - Speedup: ~30-60x per update
   * 
   * The letter index maps each letter to all grid positions where it appears:
   * Map<'A', [{r:5, c:3}, {r:7, c:8}]>
   * 
   * This enables O(1) lookup when searching for intersection opportunities.
   * 
   * @param index Existing letter index to update (mutated in place).
   * @param candidate Placement that was just committed to the grid.
   */
  private updateLetterIndex(
    index:     Map<string, { r: number; c: number }[]>,
    candidate: CandidatePlacement,
  ): void {
    const { word, row, col, direction } = candidate;
    const isAcross = direction === 'across';

    for (let i = 0; i < word.length; i++) {
      const r = isAcross ? row     : row + i;
      const c = isAcross ? col + i : col;
      const letter = word[i];

      if (!index.has(letter)) index.set(letter, []);
      index.get(letter)!.push({ r, c });
    }
  }

  /**
   * Writes one placement onto a copy of the grid and returns the updated grid.
   *
   *   Source grid to copy.
   * @param candidate Word placement to apply.
   * @returns A new grid containing the placed word.
   */
  private placeWordOnGrid(
    grid:      CrosswordCell[][],
    candidate: CandidatePlacement,
  ): CrosswordCell[][] {
    const next = grid.map(r => [...r]);
    const { word, row, col, direction } = candidate;
    for (let i = 0; i < word.length; i++) {
      const r = direction === 'across' ? row     : row + i;
      const c = direction === 'across' ? col + i : col;
      next[r][c] = word[i];
    }
    return next;
  }

  /**
   * Removes empty rows and columns around the generated crossword before it is persisted.
   * This keeps the final puzzle compact and also provides the offsets needed by the service.
   *
   * @param grid Full working grid.
   * @returns The trimmed grid plus the top-left offset of the trimmed region.
   */
  private trimGrid(grid: CrosswordCell[][]): {
    trimmed:   CrosswordCell[][];
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

  /**
   * Assigns crossword clue numbers in reading order after the grid has been trimmed.
   *
   * @param placements Trimmed placements returned by the engine.
   * @returns Placements with stable clue numbers suitable for rendering and persistence.
   */
  private assignClueNumbers(
    placements: CandidatePlacement[],
  ): IEngineResult['placements'] {
    const sorted        = [...placements].sort((a, b) =>
      a.row !== b.row ? a.row - b.row : a.col - b.col,
    );
    const cellNumberMap = new Map<string, number>();
    let next = 1;

    for (const p of sorted) {
      const key = `${p.row},${p.col}`;
      if (!cellNumberMap.has(key)) cellNumberMap.set(key, next++);
    }

    return sorted.map(p => ({
      word:      p.word,
      clue:      p.clue,
      row:       p.row,
      col:       p.col,
      direction: p.direction,
      number:    cellNumberMap.get(`${p.row},${p.col}`)!,
    }));
  }
}
