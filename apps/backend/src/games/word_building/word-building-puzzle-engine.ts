
import { IWordBuildingPuzzleEngine, IEngineResult } from './word-building-engine.interface';

// CrosswordCell = string | null  (a single letter or an empty/black cell)
type CrosswordCell = string | null;

type Direction = 'across' | 'down';

type CandidatePlacement = {
  word:      string;
  clue:      string;
  row:       number;
  col:       number;
  direction: Direction;
  score?:    number;
};

type PlacementContext = {
  grid:           CrosswordCell[][];
  letterIndex:    Map<string, { r: number; c: number }[]>;
  placedWordsSet: Set<string>;
  gridSize:       number;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT  = 1013904223;
const LCG_MODULUS    = 4294967296;

const TOP_CANDIDATE_RATIO        = 0.3;
const FUTURE_INTERSECTION_WEIGHT = 10;
const MAX_CENTER_BONUS           = 10;
const LETTER_MATCH_WEIGHT        = 5;
const MIN_WORD_LENGTH            = 2;

/**
 * Advanced crossword engine with intersection-based placement.
 * Uses a greedy algorithm with seeded randomness and strategic sorting.
 */
export class WordBuildingPuzzleEngine implements IWordBuildingPuzzleEngine {
  private readonly GRID_SIZE:    number;
  private readonly MAX_ATTEMPTS: number;
  private readonly TARGET_WORDS: number;
  private seed: number;

  /**
   * Configures the crossword generator with placement limits and an optional seed.
   * The seed keeps layout generation reproducible for debugging and tests.
   *
   * @param gridSize Maximum side length of the working grid.
   * @param maxAttempts Number of placement passes before the engine gives up.
   * @param targetWords Soft cap on how many words should be placed.
   * @param seed Optional deterministic seed for the pseudo-random picker.
   */
  constructor(gridSize = 20, maxAttempts = 80, targetWords = 8, seed?: number) {
    this.GRID_SIZE    = gridSize;
    this.MAX_ATTEMPTS = maxAttempts;
    this.TARGET_WORDS = targetWords;
    this.seed         = seed ?? Date.now();
  }

  /**
   * Advances the internal linear congruential generator and returns the next pseudo-random value.
   * This keeps crossword selection deterministic when the engine is seeded.
   *
   * @returns A number between 0 and 1.
   */
  private seededRandom(): number {
    this.seed = (this.seed * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;
    return this.seed / LCG_MODULUS;
  }

  /**
   * Normalizes input entries, filters invalid words, and runs the full crossword pipeline.
   *
   * @param rawEntries Word/clue pairs from the active vocabulary.
   * @returns The solved grid, placement metadata, and a list of words that could not be placed.
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
   * Sanitizes raw entries, removes duplicates, and records words that cannot fit the grid.
   *
   * @param rawEntries Candidate words and clues from the vocabulary.
   * @returns Valid entries sorted for placement plus any rejected words.
   */
  private prepareEntries(rawEntries: Array<{ word: string; clue: string }>): {
    sortedEntries: Array<{ word: string; clue: string }>;
    rejectedWords: string[];
  } {
    const rejectedWords: string[] = [];
    const seen = new Set<string>();
    const validEntries: Array<{ word: string; clue: string }> = [];

    for (const entry of rawEntries) {
      const normalized = entry.word
        .normalize('NFC')
        .toUpperCase()
        .replace(/[^\p{L}]/gu, '');

      if (normalized.length < MIN_WORD_LENGTH || normalized.length > this.GRID_SIZE) {
        rejectedWords.push(normalized || entry.word);
        continue;
      }
      if (seen.has(normalized)) continue;

      seen.add(normalized);
      validEntries.push({ word: normalized, clue: entry.clue });
    }

    return { sortedEntries: this.sortEntriesStrategically(validEntries), rejectedWords };
  }

  /**
   * Orders entries so the engine places longer and more interconnectable words first.
   * This improves the chance of producing a dense crossword with useful intersections.
   *
    * @param entries Valid entries ready for placement.
   * @returns The same entries sorted by placement priority.
   */
  private sortEntriesStrategically(
    entries: Array<{ word: string; clue: string }>,
  ): Array<{ word: string; clue: string }> {
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
   * Creates a fresh working grid and tracking structures for one crossword generation run.
   *
   * @returns The mutable placement context used by the rest of the engine.
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
   * Places the first word near the center so later placements have a stable anchor.
   *
   * @param context Mutable placement context for the current generation run.
   * @param entries Sorted entries with the anchor word at index 0.
   * @returns The initial placement list containing the anchor word.
   */
  private placeAnchorWord(
    context: PlacementContext,
    entries: Array<{ word: string; clue: string }>,
  ): CandidatePlacement[] {
    const first = entries[0];
    const candidate: CandidatePlacement = {
      ...first,
      row:       Math.floor(context.gridSize / 2),
      col:       Math.floor((context.gridSize - first.word.length) / 2),
      direction: 'across',
    };

    context.grid           = this.placeWordOnGrid(context.grid, candidate);
    context.placedWordsSet.add(first.word);
    context.letterIndex    = this.buildLetterIndex(context.grid);

    return [candidate];
  }

  /**
   * Repeatedly searches for intersecting placements and adds the best-scoring candidate.
   * The loop stops when it reaches the attempt budget, the target word count, or no progress.
   *
   * @param context Mutable placement context for the current generation run.
   * @param entries All valid entries being considered for placement.
   * @param placed Current list of placements, including the anchor word.
   */
  private runPlacementLoop(
    context: PlacementContext,
    entries: Array<{ word: string; clue: string }>,
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
        context.letterIndex = this.buildLetterIndex(context.grid);
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
    validEntries:  Array<{ word: string; clue: string }>,
    rejectedWords: string[],
  ): IEngineResult & { unplacedWords: string[] } {
    const unplacedWords = [
      ...rejectedWords,
      ...validEntries.filter(e => !context.placedWordsSet.has(e.word)).map(e => e.word),
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
    entry:      { word: string; clue: string },
    allEntries: Array<{ word: string; clue: string }>,
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
    allEntries: Array<{ word: string; clue: string }>,
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
   * @param context Current working grid.
   * @param candidate Placement being evaluated.
   * @param allEntries Remaining entries that could still be placed.
   * @returns An integer count used as part of the placement score.
   */
  private countFutureIntersections(
    context:    PlacementContext,
    candidate:  CandidatePlacement,
    allEntries: Array<{ word: string; clue: string }>,
  ): number {
    const { word, row: startRow, col: startCol, direction } = candidate;
    const isAcross = direction === 'across';

    const tempGrid = context.grid.map(r => [...r]);
    for (let i = 0; i < word.length; i++) {
      const r = isAcross ? startRow     : startRow + i;
      const c = isAcross ? startCol + i : startCol;
      if (tempGrid[r][c] === null) tempGrid[r][c] = word[i];
    }

    const tempIndex = this.buildLetterIndex(tempGrid);
    let count = 0;

    for (const entry of allEntries) {
      if (entry.word === word || context.placedWordsSet.has(entry.word)) continue;
      const shared = new Set(word.split('').filter(l => entry.word.includes(l)));
      if (shared.size > 0 && Array.from(shared).some(l => tempIndex.has(l))) count++;
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
   * Builds an index of grid positions per letter to make intersection lookup cheap.
   *
   * @param grid Current working crossword grid.
   * @returns A map of letters to the coordinates where they appear.
   */
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

  /**
   * Writes one placement onto a copy of the grid and returns the updated grid.
   *
   * @param grid Source grid to copy.
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
