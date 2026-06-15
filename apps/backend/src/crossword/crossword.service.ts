import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VocabulariesService } from '../vocabularies/vocabularies.service';
import {
  CrosswordCell,
  CrosswordEntry,
  CrosswordPuzzleInternal,
  CrosswordPuzzlePublic,
  CrosswordUpdate,
} from './crossword.types';
import { LegacyEngine } from './engines/legacy.engine';
import { HybridEngine } from './engines/hybrid.engine';
import { CrosswordEngine } from './engines/crossword-engine.interface';
import {
  WordDifficulty,
  DIFFICULTY_CONFIG,
  getWordsByDifficulty,
  getWordsFromEntries,
} from './words/crossword-words';

// crossword-logic Addition: Use hybrid engine for better puzzle quality
const USE_HYBRID_ENGINE = true;
const DEFAULT_DIFFICULTY: WordDifficulty = 'easy';

@Injectable()
export class CrosswordService {
  private readonly logger = new Logger(CrosswordService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vocabulariesService: VocabulariesService,
  ) {}

  /**
   * crossword-logic Addition: Create engine instance based on difficulty
   * This ensures each puzzle generation uses the correct grid size and constraints
   */
  private createEngine(difficulty: WordDifficulty): CrosswordEngine {
    if (USE_HYBRID_ENGINE) {
      const config = DIFFICULTY_CONFIG[difficulty];
      return new HybridEngine(config.gridSize, config.maxAttempts, config.wordCount);
    }
    return new LegacyEngine();
  }

  /**
   * crossword-logic Addition: Initialize or regenerate crossword puzzle
   * @param gameId - Unique game identifier
   * @param entries - Optional custom word entries
   * @param difficulty - Puzzle difficulty level (easy/medium/hard)
   * @param forceRegenerate - If true, deletes existing puzzle and creates new one
   */
  async init(
    gameId: number,
    entries?: CrosswordEntry[],
    difficulty: WordDifficulty = DEFAULT_DIFFICULTY,
    forceRegenerate = false,
  ): Promise<CrosswordPuzzlePublic> {
    // Check if puzzle already exists
    const existing = await this.prisma.crossword.findUnique({
      where: { gameId },
    });

    // If puzzle exists and regeneration not requested, return existing
    if (existing && !forceRegenerate) {
      return this.sanitizePuzzle(this.rowToPuzzle(existing));
    }

    // If regeneration requested, delete old puzzle
    if (existing && forceRegenerate) {
      await this.prisma.crossword.delete({ where: { gameId } });
    }

    // Load word entries from custom input or group vocabulary
    const wordEntries = entries && entries.length >= 2
      ? getWordsFromEntries(entries)
      : await this.loadGroupVocabulary(gameId, difficulty);

    // Convert entries to engine input format
    const wordInputs = wordEntries.map((e) => ({ word: e.word, clue: e.clue }));

    // Create engine with selected difficulty configuration
    const engine = this.createEngine(difficulty);

    // Generate puzzle using difficulty-specific engine
    const result = engine.generate(wordInputs);

    // Validate engine result has valid content
    if (!result.solution || result.solution.length === 0 || result.placements.length === 0) {
      this.logger.warn(`[crossword-logic Addition] Engine produced empty result for gameId ${gameId}`);
      throw new Error('Failed to generate valid crossword puzzle');
    }

    // Initialize empty player grid (user will fill in letters)
    const playerGrid: CrosswordCell[][] = result.solution.map((row) =>
      row.map((cell) => (cell ? '' : null)),
    );

    // Persist puzzle to database with solution and empty player grid
    const puzzle = await this.prisma.crossword.create({
      data: {
        gameId,
        rows: result.rows,
        cols: result.cols,
        solution: JSON.stringify(result.solution),
        playerGrid: JSON.stringify(playerGrid),
        clues: JSON.stringify({
          across: result.placements.filter((p) => p.direction === 'across'),
          down: result.placements.filter((p) => p.direction === 'down'),
        }),
        revision: 0,
        solved: false,
      },
    });

    return this.sanitizePuzzle(this.rowToPuzzle(puzzle));
  }

  /**
   * crossword-logic Addition: Retrieve existing puzzle without solution
   * Solution is sanitized to prevent cheating
   */
  async get(gameId: number): Promise<CrosswordPuzzlePublic | undefined> {
    const row = await this.prisma.crossword.findUnique({
      where: { gameId },
    });
    return row ? this.sanitizePuzzle(this.rowToPuzzle(row)) : undefined;
  }

  async hasPuzzle(gameId: number): Promise<boolean> {
    const count = await this.prisma.crossword.count({
      where: { gameId },
    });
    return count > 0;
  }

  /**
   * crossword-logic Addition: Update single cell with player's letter
   * Validates coordinates and only updates playable cells
   */
  async update(gameId: number, update: CrosswordUpdate): Promise<CrosswordPuzzlePublic | undefined> {
    const row = await this.prisma.crossword.findUnique({
      where: { gameId },
    });
    if (!row) return undefined;

    const puzzle = this.rowToPuzzle(row);
    const { row: r, col, letter } = update;

    // Validate coordinates are within grid bounds
    if (r < 0 || r >= puzzle.rows || col < 0 || col >= puzzle.cols) {
      return this.sanitizePuzzle(puzzle);
    }

    // Only update playable cells (cells that contain letters in solution)
    if (!this.isPlayableCell(puzzle, r, col)) return this.sanitizePuzzle(puzzle);

    // Store uppercase letter in player grid
    puzzle.playerGrid[r][col] = letter.toUpperCase().slice(0, 1);
    // Increment revision for optimistic UI updates
    puzzle.revision += 1;
    // Check if puzzle is now completely solved
    puzzle.solved = this.isSolved(puzzle);

    await this.prisma.crossword.update({
      where: { gameId },
      data: {
        playerGrid: JSON.stringify(puzzle.playerGrid),
        revision: puzzle.revision,
        solved: puzzle.solved,
      },
    });

    return this.sanitizePuzzle(puzzle);
  }

  /**
   * crossword-logic Addition: Check player's solution against correct answers
   * Returns list of incorrect cells for feedback
   */
  async check(gameId: number): Promise<{ solved: boolean; wrongCells: Array<{ row: number; col: number }> } | undefined> {
    const row = await this.prisma.crossword.findUnique({
      where: { gameId },
    });
    if (!row) return undefined;

    const puzzle = this.rowToPuzzle(row);
    const wrongCells: Array<{ row: number; col: number }> = [];

    // Compare each playable cell with solution
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        if (!this.isPlayableCell(puzzle, r, c)) continue;
        // If player's letter doesn't match solution, mark as wrong
        if (puzzle.playerGrid[r][c] !== puzzle.solution[r][c]) {
          wrongCells.push({ row: r, col: c });
        }
      }
    }

    puzzle.solved = wrongCells.length === 0;

    await this.prisma.crossword.update({
      where: { gameId },
      data: { solved: puzzle.solved },
    });

    return { solved: puzzle.solved, wrongCells };
  }

  async destroy(gameId: number): Promise<void> {
    await this.prisma.crossword.deleteMany({
      where: { gameId },
    });
  }

  /**
   * crossword-logic Addition: Load vocabulary from group's active vocabulary list
   * Falls back to static word pool if group vocabulary unavailable
   */
  private async loadGroupVocabulary(
    gameId: number,
    difficulty: WordDifficulty,
  ) {
    try {
      // Fetch game to access group vocabulary
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        include: { 
          gamePlayers: true,
          group: true,
        },
      });

      if (game && game.group) {
        // Load all vocabularies for this group
        const groupVocabularies = await this.vocabulariesService.findByGroup(game.inGroupId);
        
        // Use active vocabulary (matched by group's currentVocabularyId) or first available
        const activeVocabulary = game.group.currentVocabularyId
          ? groupVocabularies.find((v) => v.id === game.group.currentVocabularyId)
          : groupVocabularies[0];

        // If vocabulary has sufficient words, use them
        if (activeVocabulary && activeVocabulary.words.length >= 2) {
          const entries = activeVocabulary.words.map((w, i) => ({
            answer: w,
            clue: activeVocabulary.meanings[i] || `Meaning of ${w}`,
          }));
          return getWordsFromEntries(entries, difficulty);
        }
      }
    } catch (error) {
      // Log error but don't fail - fall back to static dictionary
      this.logger.warn(
        `[crossword-logic Addition] Failed to load group vocabulary for gameId ${gameId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Return static word pool filtered by difficulty
    return getWordsByDifficulty(difficulty);
  }

  /**
   * crossword-logic Addition: Check if cell is playable (contains a letter)
   * Blocked cells are null in solution grid
   */
  private isPlayableCell(puzzle: CrosswordPuzzleInternal, row: number, col: number): boolean {
    return Boolean(puzzle.solution[row]?.[col]);
  }

  /**
   * crossword-logic Addition: Check if all playable cells match solution
   */
  private isSolved(puzzle: CrosswordPuzzleInternal): boolean {
    for (let row = 0; row < puzzle.rows; row++) {
      for (let col = 0; col < puzzle.cols; col++) {
        if (!this.isPlayableCell(puzzle, row, col)) continue;
        // If any cell doesn't match, puzzle is not solved
        if (puzzle.playerGrid[row][col] !== puzzle.solution[row][col]) return false;
      }
    }
    return true;
  }

  /**
   * crossword-logic Addition: Remove solution from puzzle before sending to client
   * This prevents cheating by inspecting network responses
   */
  private sanitizePuzzle(puzzle: CrosswordPuzzleInternal): CrosswordPuzzlePublic {
    // Destructure to exclude solution
    const { solution: _solution, ...rest } = puzzle;
    // Return puzzle with deep-cloned arrays to prevent mutation
    return {
      ...rest,
      playerGrid: puzzle.playerGrid.map((r) => [...r]),
      clues: {
        across: puzzle.clues.across.map((p) => ({ ...p })),
        down: puzzle.clues.down.map((p) => ({ ...p })),
      },
    };
  }

  /**
   * crossword-logic Addition: Convert database row to typed puzzle object
   * Handles JSON parsing of serialized grid/clue data
   */
  private rowToPuzzle(row: {
    gameId: number;
    rows: number;
    cols: number;
    solution: unknown;
    playerGrid: unknown;
    clues: unknown;
    revision: number;
    solved: boolean;
  }): CrosswordPuzzleInternal {
    try {
      // Parse JSON fields if stored as strings
      const solution = typeof row.solution === 'string' ? JSON.parse(row.solution) : row.solution;
      const playerGrid = typeof row.playerGrid === 'string' ? JSON.parse(row.playerGrid) : row.playerGrid;
      const clues = typeof row.clues === 'string' ? JSON.parse(row.clues) : row.clues;

      return {
        gameId: row.gameId,
        rows: row.rows,
        cols: row.cols,
        solution: solution as CrosswordCell[][],
        playerGrid: playerGrid as CrosswordCell[][],
        clues: clues as CrosswordPuzzleInternal['clues'],
        revision: row.revision,
        solved: row.solved,
      };
    } catch (error) {
      this.logger.error(`Failed to parse crossword puzzle data for gameId ${row.gameId}: ${error}`);
      throw new Error('Corrupted crossword data');
    }
  }
}
