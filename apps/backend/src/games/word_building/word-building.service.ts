/**
 * Word Building Service
 *
 * Integrates crossword generation, database persistence, and real-time gameplay state management.
 *
 * Responsibilities:
 * - Puzzle Generation: Creates crossword puzzles using WordBuildingPuzzleEngine with quality guarantee
 * - State Management: Maintains in-memory live game state with lazy hydration from database
 * - Letter Placement: Handles WebSocket-driven letter placement with validation and scoring
 * - Credit Tracking: Implements "first-correct-placer wins" scoring via creditGrid
 * - Database Sync: Persists final state on puzzle completion
 *
 * Grid Dimensions:
 * - Fixed 18×18 board (COURT_COLS × COURT_ROWS)
 * - Must match game-court.tsx constants on frontend
 * - Trimmed puzzles are centered within this fixed canvas
 *
 * Quality Guarantee:
 * - Generates multiple puzzle candidates (each with fresh randomness)
 * - Selects the densest puzzle (highest placement count)
 * - Early exits if any candidate achieves ≥80% vocabulary placement
 *
 * State Flow:
 * 1. POST /initWordBuildingCourt: Generate puzzle → persist → return initial grid
 * 2. WebSocket placeLetter: Validate → update live state → broadcast payload
 * 3. On solve: Persist final grid + scores → mark game finished → evict from memory
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WordBuildingPuzzleEngine } from './word-building-puzzle-engine';
import {
  ClueEntry,
  ClueMap,
  CourtCell,
  ICellLock,
  ICellLocksPayload,
  IGameStatePayload,
  IInitCourtResponse,
  ILiveGameState,
  IPlaceLetterDto,
} from './word-building.types';

/** Fixed board width - must match game-court.tsx COURT_COLS */
const COURT_COLS = 18;
/** Fixed board height - must match game-court.tsx COURT_ROWS */
const COURT_ROWS = 18;
/** Quality guarantee: Generate up to 3 puzzles and pick the densest one */
const CANDIDATE_COUNT = 3;
/** Early exit threshold: Stop generating if placement ratio >= 80% */
const EARLY_EXIT_PLACEMENT_RATIO = 0.8;
/** Persist mid-game state every N placements to prevent data loss on server crash */
const PERSISTENCE_INTERVAL = 5;

/**
 * Extended state interface that caches expensive computations.
 * This prevents recomputing board offsets and clue maps on every single keystroke.
 */
interface InternalLiveGameState extends ILiveGameState {
  offsetRow: number;
  offsetCol: number;
  clueNumberMap: Map<string, number>;
}

@Injectable()
export class WordBuildingService {
  private readonly logger = new Logger(WordBuildingService.name);
  /** In-memory live state, keyed by gameId. Evicted on puzzle completion. */
  private readonly liveGames = new Map<number, InternalLiveGameState>();
  /** Timer handles for auto-expiring soft cell locks. Key: "gameId:row:col" */
  private readonly lockTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initializes a crossword puzzle for a game - generates, persists, and returns initial grid state.
   *
   * Flow:
   * 1. Check for existing crossword in database (idempotent - returns cached if exists)
   * 2. Fetch game + group + active vocabulary
   * 3. Generate puzzle with quality guarantee:
   *    - Run engine multiple times (each with fresh randomness)
   *    - Track the best result (highest word placement count)
   *    - Early exit if any candidate achieves ≥80% placement ratio
   * 4. Pad trimmed puzzle to fixed 18×18 grid (centered)
   * 5. Persist to database: solution, playerGrid (all null), creditGrid (all null), clues
   * 6. Return initial courts + clues (without exposing solution letters)
   *
   * Quality Guarantee:
   * - Generates multiple puzzle candidates with different randomness
   * - Prevents sparse/unsolvable puzzles by selecting the best candidate
   * - Multiple candidates balance quality with performance
   *
   * @param gameId Game ID requiring crossword initialization.
   * @returns Initial grid state for frontend rendering.
   * @throws If game not found or group has no active vocabulary.
   */
  async initCourt(gameId: number): Promise<IInitCourtResponse> {
    // Idempotent: if crossword already exists, rehydrate from database
    const existing = await this.prisma.crossword.findUnique({
      where: { gameId },
    });
    if (existing) {
      await this.loadOrHydrate(gameId);
      return this.rehydrateInitResponse(existing);
    }

    // Fetch game with vocabulary
    const game = await this.prisma.game.findUniqueOrThrow({
      where: { id: gameId },
      include: { group: { include: { currentVocabulary: true } } },
    });

    const vocab = game.group.currentVocabulary;
    if (!vocab)
      throw new Error(`No active vocabulary for group ${game.inGroupId}`);

    const entries = vocab.words.map((word: string, i: number) => ({
      word,
      clue: vocab.meanings[i] ?? '',
    }));

    // Quality guarantee: generate multiple puzzles and pick the best one
    let bestResult: ReturnType<
      typeof WordBuildingPuzzleEngine.prototype.generate
    > | null = null;
    let maxPlacedWords = -1;

    for (let i = 0; i < CANDIDATE_COUNT; i++) {
      const engine = new WordBuildingPuzzleEngine(
        Math.min(COURT_COLS, COURT_ROWS),
        80,
        12,
      );
      const result = engine.generate(entries);

      const placedCount = result.placements.length;
      const placementRatio = placedCount / entries.length;

      this.logger.log(
        `Candidate ${i + 1}/${CANDIDATE_COUNT}: ${placedCount} words placed ` +
          `(${(placementRatio * 100).toFixed(1)}% of vocabulary)`,
      );

      if (placedCount > maxPlacedWords) {
        maxPlacedWords = placedCount;
        bestResult = result;
      }

      // Early exit: stop if we achieve 80%+ placement ratio
      if (placementRatio >= EARLY_EXIT_PLACEMENT_RATIO) {
        this.logger.log(
          `Early exit: ${(placementRatio * 100).toFixed(1)}% threshold met`,
        );
        break;
      }
    }

    const result = bestResult!;

    // Pad trimmed puzzle to fixed board size (centered)
    const solution = this.padGrid(result.solution, COURT_ROWS, COURT_COLS);
    const playerGrid = solution.map((row) =>
      row.map(() => null as string | null),
    );
    const clues = this.buildClueMap(result.placements);

    // Persist to database.
    // Wrap in try/catch to handle the race condition that occurs when two players
    // open the game page at the same moment: both call initCourt, both find no
    // existing crossword, both generate a puzzle, and both attempt to create.
    // The second writer receives a Prisma unique-constraint error (P2002).
    // In that case, load the crossword that was just created by the winner.
    try {
      await this.prisma.crossword.create({
        data: {
          gameId,
          rows: COURT_ROWS,
          cols: COURT_COLS,
          solution: solution as unknown as object,
          playerGrid: playerGrid as unknown as object,
          creditGrid: playerGrid as unknown as object, // Same shape, all null initially
          clues: clues as unknown as object,
          revision: 0,
          solved: false,
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: unknown }).code === 'P2002'
      ) {
        // Another concurrent request won the race. Use its result.
        const concurrent = await this.prisma.crossword.findUniqueOrThrow({
          where: { gameId },
        });
        await this.loadOrHydrate(gameId);
        return this.rehydrateInitResponse(concurrent);
      }
      throw error;
    }

    await this.loadOrHydrate(gameId);
    return this.buildInitResponse(solution, clues);
  }

  /**
   * Processes a letter placement from a player via WebSocket.
   *
   * Flow:
   * 1. Normalize letter: NFC Unicode → uppercase → strip non-letters
   * 2. Load or hydrate game state from memory/database
   * 3. Ignore black squares (solution[r][c] === null)
   * 4. Update playerGrid with normalized letter
   * 5. Check correctness: compare with solution[r][c]
   * 6. First-correct-placer scoring:
   *    - If correct AND creditGrid[r][c] is null → assign playerId, increment score
   *    - If already credited OR wrong → no score change
   * 7. Build payload: visibleCourt (correct/wrong/empty), scores, solved flag
   * 8. If solved → persist completion (final grids + scores + isFinished=true), evict from memory
   * 9. Return payload for broadcast to game room
   *
   * Scoring Rules:
   * - First player to correctly place a letter wins the point permanently
   * - Wrong placements have no effect on credit ownership
   * - Overwriting correct letters has no effect (credit is sticky)
   *
   * @param dto Letter placement data from WebSocket event.
   * @returns Updated game state payload for broadcast, or null if black square clicked.
   */
  async placeLetter(dto: IPlaceLetterDto): Promise<IGameStatePayload | null> {
    const { gameId, playerId, row, col, letter } = dto;

    // Normalize letter: identical pipeline to prepareEntries() in the puzzle engine so
    // comparison against the stored solution is always consistent.
    // Custom mapping preserves 'ß' as a single character — .toUpperCase() would expand it to 'SS'.
    const normalized = letter
      .normalize('NFC')
      .split('')
      .map((char) => (char === 'ß' || char === 'ẞ' ? 'ß' : char.toUpperCase()))
      .join('')
      .replace(/[^\p{L}]/gu, '');
    if (!normalized || normalized.length !== 1) return null;

    // Load live state (from memory or hydrate from database)
    const state = await this.loadOrHydrate(gameId);

    // Ignore clicks on black squares (no-op)
    if (state.solution[row]?.[col] === null) return null;

    // Don't overwrite cells that already have a correct first-placer credit
    if (state.creditGrid[row]?.[col] !== null) return null;

    // Reject placement if another player holds an active soft lock on this cell
    const lockKey = `${row},${col}`;
    const existingLock = state.locks.get(lockKey);
    if (
      existingLock &&
      existingLock.playerId !== playerId &&
      existingLock.expiresAt > Date.now()
    ) {
      return null;
    }

    // Update player grid with normalized letter
    state.playerGrid[row][col] = normalized;
    state.revision++;

    // Check correctness and credit
    const isCorrect = normalized === state.solution[row][col];
    const alreadyCredited = state.creditGrid[row][col] !== null;

    // First correct placer wins permanently
    if (isCorrect && !alreadyCredited) {
      state.creditGrid[row][col] = playerId;
      state.scores.set(playerId, (state.scores.get(playerId) ?? 0) + 1);
    }

    // Placement completes the interaction — clear the soft lock
    state.locks.delete(lockKey);

    // Build payload with current state
    const payload = this.buildPayload(state);

    // Persist mid-game state periodically to prevent data loss on server restart
    if (state.revision % PERSISTENCE_INTERVAL === 0) {
      await this.persistMidGameState(gameId, state);
      this.logger.debug(
        `Mid-game state persisted at revision ${state.revision}`,
      );
    }

    // Persist completion if puzzle is fully solved
    if (payload.solved) {
      await this.persistCompletion(gameId, state);
    }

    return payload;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /**
   * Builds the live payload sent to the client after a letter placement or reconnect.
   *
   * OPTIMIZATION:
   * This method is called on EVERY keystroke (via WebSocket). To prevent redundant computation,
   * it relies on `offsetRow`, `offsetCol`, and `clueNumberMap` being pre-calculated and cached
   * in the `InternalLiveGameState` during `loadOrHydrate()`. This reduces the per-keystroke
   * complexity from O(rows × cols + clues) down to just the O(rows × cols) grid scan required
   * to build the `visibleCourt` array.
   *
   * @param state The current in-memory crossword state (with cached offsets and clue map).
   * @returns The WebSocket payload broadcast to the game room.
   */
  private buildPayload(state: InternalLiveGameState): IGameStatePayload {
    const {
      solution,
      playerGrid,
      creditGrid,
      scores,
      revision,
      clueNumberMap,
    } = state;
    const rows = solution.length;
    const cols = solution[0]?.length ?? 0;

    let allCorrect = true;
    const visibleCourt: CourtCell[][] = [];

    for (let r = 0; r < rows; r++) {
      const row: CourtCell[] = [];
      for (let c = 0; c < cols; c++) {
        const solutionLetter = solution[r][c];
        const placed = playerGrid[r][c];
        const clueNumber = clueNumberMap.get(`${r},${c}`);
        const cn = clueNumber ? { clueNumber } : {};

        if (solutionLetter === null) {
          row.push({ char: '', status: 'none' });
          continue;
        }

        if (placed === null) {
          allCorrect = false;
          row.push({ char: '', status: 'empty', ...cn });
        } else if (placed === solutionLetter) {
          row.push({
            char: placed,
            status: 'correct',
            placedBy: creditGrid[r][c] ?? undefined,
            ...cn,
          });
        } else {
          allCorrect = false;
          row.push({ char: placed, status: 'wrong', ...cn });
        }
      }
      visibleCourt.push(row);
    }

    return {
      visibleCourt,
      scores: Array.from(scores.entries()).map(([pid, score]) => ({
        playerId: pid,
        score,
      })),
      solved: allCorrect,
      revision,
    };
  }

  /**
   * Persists the current mid-game state to the database.
   * Called periodically (every PERSISTENCE_INTERVAL revisions) to ensure that if the
   * Node process crashes, players only lose a few letters of progress rather than the whole game.
   *
   * @param gameId The ID of the game being played.
   * @param state The current live game state.
   */
  private async persistMidGameState(
    gameId: number,
    state: InternalLiveGameState,
  ): Promise<void> {
    await this.prisma.crossword.update({
      where: { gameId },
      data: {
        playerGrid: state.playerGrid as unknown as object,
        creditGrid: state.creditGrid as unknown as object,
        revision: state.revision,
      },
    });
  }

  /**
   * Builds the initial REST payload when a crossword is first created.
   * Pads clue coordinates onto the visible board so the client can render numbers.
   *
   * @param solution Trimmed crossword solution grid.
   * @param clues Clue metadata produced by the engine.
   * @returns The initial court payload sent on mount.
   */
  private buildInitResponse(
    solution: (string | null)[][],
    clues: ClueMap,
  ): IInitCourtResponse {
    const { offsetRow, offsetCol } = this.getBoardOffset(solution);
    const clueNumberMap = new Map<string, number>();
    for (const entry of [...clues.across, ...clues.down]) {
      clueNumberMap.set(
        `${entry.row + offsetRow},${entry.col + offsetCol}`,
        entry.number,
      );
    }

    const rows = solution.length;
    const cols = solution[0]?.length ?? 0;

    const trueCourt: CourtCell[][] = [];
    const visibleCourt: CourtCell[][] = [];

    for (let r = 0; r < rows; r++) {
      const trueRow: CourtCell[] = [];
      const visibleRow: CourtCell[] = [];

      for (let c = 0; c < cols; c++) {
        const letter = solution[r][c];
        const clueNumber = clueNumberMap.get(`${r},${c}`);

        if (letter === null) {
          trueRow.push({ char: '', status: 'none' });
          visibleRow.push({ char: '', status: 'none' });
        } else {
          trueRow.push({
            char: '',
            status: 'empty',
            ...(clueNumber ? { clueNumber } : {}),
          });
          visibleRow.push({
            char: '',
            status: 'empty',
            ...(clueNumber ? { clueNumber } : {}),
          });
        }
      }
      trueCourt.push(trueRow);
      visibleCourt.push(visibleRow);
    }

    const sanitizedClues = {
      across: clues.across.map(({ number, clue, direction, row, col }) => ({
        number,
        clue,
        direction,
        row: row + offsetRow,
        col: col + offsetCol,
      })),
      down: clues.down.map(({ number, clue, direction, row, col }) => ({
        number,
        clue,
        direction,
        row: row + offsetRow,
        col: col + offsetCol,
      })),
    };

    // Extract unique letters from the solution for the tile rack
    const lettersSet = new Set<string>();
    for (const row of solution) {
      for (const cell of row) {
        if (cell !== null && /\p{L}/u.test(cell)) {
          lettersSet.add(cell);
        }
      }
    }
    const availableLetters = Array.from(lettersSet).sort((a, b) =>
      a.localeCompare(b),
    );

    return { trueCourt, visibleCourt, availableLetters, clues: sanitizedClues };
  }

  /**
   * Reconstructs the initial response from a persisted crossword row.
   * This is used when a client reconnects and the crossword already exists in the database.
   *
   * @param crossword Persisted crossword row from Prisma.
   * @returns The initial court payload rebuilt from stored state.
   */
  private rehydrateInitResponse(crossword: {
    solution: unknown;
    playerGrid: unknown;
    creditGrid: unknown;
    clues: unknown;
  }): IInitCourtResponse {
    const solution = crossword.solution as (string | null)[][];
    const playerGrid = crossword.playerGrid as (string | null)[][];
    const clues = crossword.clues as ClueMap;

    const { offsetRow, offsetCol } = this.getBoardOffset(solution);
    const clueNumberMap = new Map<string, number>();
    for (const entry of [...clues.across, ...clues.down]) {
      clueNumberMap.set(
        `${entry.row + offsetRow},${entry.col + offsetCol}`,
        entry.number,
      );
    }

    const rows = solution.length;
    const cols = solution[0]?.length ?? 0;

    const trueCourt: CourtCell[][] = [];
    const visibleCourt: CourtCell[][] = [];

    for (let r = 0; r < rows; r++) {
      const trueRow: CourtCell[] = [];
      const visibleRow: CourtCell[] = [];

      for (let c = 0; c < cols; c++) {
        const letter = solution[r][c];
        const placed = playerGrid[r][c];
        const clueNumber = clueNumberMap.get(`${r},${c}`);
        const cn = clueNumber ? { clueNumber } : {};

        if (letter === null) {
          trueRow.push({ char: '', status: 'none' });
          visibleRow.push({ char: '', status: 'none' });
        } else {
          trueRow.push({ char: letter, status: 'correct', ...cn });
          if (placed === null) {
            visibleRow.push({ char: '', status: 'empty', ...cn });
          } else if (placed === letter) {
            visibleRow.push({ char: placed, status: 'correct', ...cn });
          } else {
            visibleRow.push({ char: placed, status: 'wrong', ...cn });
          }
        }
      }
      trueCourt.push(trueRow);
      visibleCourt.push(visibleRow);
    }

    const sanitizedClues = {
      across: clues.across.map(({ number, clue, direction, row, col }) => ({
        number,
        clue,
        direction,
        row: row + offsetRow,
        col: col + offsetCol,
      })),
      down: clues.down.map(({ number, clue, direction, row, col }) => ({
        number,
        clue,
        direction,
        row: row + offsetRow,
        col: col + offsetCol,
      })),
    };

    // Extract unique letters from the solution for the tile rack
    const lettersSet = new Set<string>();
    for (const row of solution) {
      for (const cell of row) {
        if (cell !== null && /\p{L}/u.test(cell)) {
          lettersSet.add(cell);
        }
      }
    }
    const availableLetters = Array.from(lettersSet).sort((a, b) =>
      a.localeCompare(b),
    );

    return { trueCourt, visibleCourt, availableLetters, clues: sanitizedClues };
  }

  /**
   * Loads the live crossword state from memory or hydrates it from the database on demand.
   *
   * @param gameId Game whose state should be loaded.
   * @returns The mutable in-memory state used by placement and state refresh paths.
   */
  /**
   * Loads the live state from memory or hydrates it from the database on demand.
   *
   * OPTIMIZATION:
   * When hydrating from the DB, it pre-calculates the `offsetRow`, `offsetCol`, and
   * `clueNumberMap` and stores them in the `InternalLiveGameState`. This ensures that
   * subsequent calls to `buildPayload()` (which happen on every keystroke) do not have
   * to recalculate these static values.
   *
   * @param gameId Game whose state should be loaded.
   * @returns The mutable in-memory state used by placement and state refresh paths.
   */
  private async loadOrHydrate(gameId: number): Promise<InternalLiveGameState> {
    if (this.liveGames.has(gameId)) return this.liveGames.get(gameId)!;

    const crossword = await this.prisma.crossword.findUniqueOrThrow({
      where: { gameId },
      include: { game: { include: { gamePlayers: true } } },
    });

    const solution = crossword.solution as (string | null)[][];
    const playerGrid = crossword.playerGrid as (string | null)[][];
    const clues = crossword.clues as ClueMap;
    const rows = solution.length;
    const cols = solution[0]?.length ?? 0;

    // Pre-calculate and cache static offsets and clue maps for fast payload building
    const { offsetRow, offsetCol } = this.getBoardOffset(solution);
    const clueNumberMap = new Map<string, number>();
    for (const entry of [...clues.across, ...clues.down]) {
      clueNumberMap.set(
        `${entry.row + offsetRow},${entry.col + offsetCol}`,
        entry.number,
      );
    }

    const creditGrid: (number | null)[][] = crossword.creditGrid
      ? (crossword.creditGrid as (number | null)[][])
      : Array.from({ length: rows }, () =>
          Array<number | null>(cols).fill(null),
        );

    const scores = new Map<number, number>();
    for (const gp of crossword.game.gamePlayers) {
      scores.set(gp.playerId, gp.score);
    }

    const state: InternalLiveGameState = {
      solution,
      playerGrid,
      creditGrid,
      scores,
      clues,
      revision: crossword.revision,
      locks: new Map(), // soft cell reservations — always empty on hydration
      offsetRow,
      offsetCol,
      clueNumberMap,
    };

    this.liveGames.set(gameId, state);
    return state;
  }

  /**
   * Persists the solved crossword, final scores, and finished-game flag in a single transaction.
   * The live game is removed from memory after the terminal state has been stored.
   *
   * @param gameId Game being completed.
   * @param state Final crossword state.
   */
  private async persistCompletion(
    gameId: number,
    state: InternalLiveGameState,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.crossword.update({
        where: { gameId },
        data: {
          playerGrid: state.playerGrid as unknown as object,
          creditGrid: state.creditGrid as unknown as object,
          solved: true,
          revision: state.revision,
        },
      }),
      ...Array.from(state.scores.entries()).map(([playerId, score]) =>
        this.prisma.gamePlayer.updateMany({
          where: { gameId, playerId },
          data: { score, completed: true },
        }),
      ),
      this.prisma.game.update({
        where: { id: gameId },
        data: { isFinished: true },
      }),
    ]);

    this.liveGames.delete(gameId);
  }

  /**
   * Centers a trimmed crossword inside the fixed board used by the frontend.
   *
   * @param trimmed Crossword grid returned by the engine.
   * @param targetRows Fixed board height.
   * @param targetCols Fixed board width.
   * @returns The crossword padded to the full board size.
   */
  private padGrid(
    trimmed: (string | null)[][],
    targetRows: number,
    targetCols: number,
  ): (string | null)[][] {
    const trimRows = trimmed.length;
    const trimCols = trimmed[0]?.length ?? 0;

    const rowOffset = Math.max(0, Math.floor((targetRows - trimRows) / 2));
    const colOffset = Math.max(0, Math.floor((targetCols - trimCols) / 2));

    const padded: (string | null)[][] = Array.from({ length: targetRows }, () =>
      Array<string | null>(targetCols).fill(null),
    );

    for (let r = 0; r < trimRows && r + rowOffset < targetRows; r++) {
      for (let c = 0; c < trimCols && c + colOffset < targetCols; c++) {
        padded[r + rowOffset][c + colOffset] = trimmed[r][c];
      }
    }

    return padded;
  }

  /**
   * Splits the engine placements into across and down clue collections.
   *
   * @param placements Engine placements with clue numbers and coordinates.
   * @returns The clue map stored in the database and sent to the client.
   */
  private buildClueMap(
    placements: Array<{
      word: string;
      clue: string;
      row: number;
      col: number;
      direction: string;
      number: number;
    }>,
  ): ClueMap {
    const across: ClueEntry[] = [];
    const down: ClueEntry[] = [];

    for (const p of placements) {
      const entry: ClueEntry = {
        number: p.number,
        clue: p.clue,
        row: p.row,
        col: p.col,
        direction: p.direction as 'across' | 'down',
        word: p.word,
      };
      if (p.direction === 'across') across.push(entry);
      else down.push(entry);
    }

    return { across, down };
  }

  /**
   * Finds the top-left offset of the non-empty crossword cells inside the padded board.
   * This offset is required to keep clue numbers aligned after the engine trims the grid.
   *
   * @param solution Padded solution grid.
   * @returns Row and column offsets where the crossword starts.
   */
  private getBoardOffset(solution: (string | null)[][]): {
    offsetRow: number;
    offsetCol: number;
  } {
    let offsetRow = 0;
    let offsetCol = 0;

    for (let r = 0; r < solution.length; r++) {
      if (solution[r].some((cell) => cell !== null)) {
        offsetRow = r;
        break;
      }
    }

    for (let c = 0; c < (solution[0]?.length ?? 0); c++) {
      if (solution.some((row) => row[c] !== null)) {
        offsetCol = c;
        break;
      }
    }

    return { offsetRow, offsetCol };
  }

  // ─── Cell lock management (called by GameGateway) ──────────────────────────

  /**
   * Acquires a soft lock on a cell for a player and schedules automatic expiry.
   * If the cell is already held by a different active lock, the request is ignored
   * and the current locks map is returned unchanged.
   *
   * @param gameId The game to update.
   * @param row Cell row.
   * @param col Cell column.
   * @param playerId Player acquiring the lock.
   * @param playerName Display name shown to other players.
   * @param expiresAt Unix timestamp (ms) when the lock auto-expires.
   * @param onExpire Callback to broadcast the updated locks when timer fires.
   * @returns Updated locks payload for broadcast.
   */
  lockCell(
    gameId: number,
    row: number,
    col: number,
    playerId: number,
    playerName: string,
    expiresAt: number,
    onExpire: (payload: ICellLocksPayload) => void,
  ): ICellLocksPayload {
    const state = this.liveGames.get(gameId);
    if (!state) return { locks: [] };
    const key = `${row},${col}`;
    const existing = state.locks.get(key);
    // Don't steal a lock held by another player
    if (
      existing &&
      existing.playerId !== playerId &&
      existing.expiresAt > Date.now()
    ) {
      return this.getLocksPayload(gameId);
    }
    state.locks.set(key, {
      playerId,
      playerName,
      expiresAt,
    } satisfies ICellLock);
    this.scheduleLockExpiry(gameId, row, col, playerId, expiresAt, onExpire);
    return this.getLocksPayload(gameId);
  }

  /**
   * Releases a soft lock on a cell and cancels its auto-expire timer.
   * Only the lock owner can release; calls by other players are silently ignored.
   *
   * @param gameId The game to update.
   * @param row Cell row.
   * @param col Cell column.
   * @param playerId Must be the current lock owner.
   * @returns Updated locks payload for broadcast.
   */
  unlockCell(
    gameId: number,
    row: number,
    col: number,
    playerId: number,
  ): ICellLocksPayload {
    const state = this.liveGames.get(gameId);
    if (!state) return { locks: [] };
    const key = `${row},${col}`;
    const lock = state.locks.get(key);
    if (lock?.playerId === playerId) {
      state.locks.delete(key);
      this.cancelLockTimer(gameId, row, col);
    }
    return this.getLocksPayload(gameId);
  }

  /**
   * Releases all soft locks held by a player and cancels their timers.
   * Called on socket disconnect so cells are not left blocked indefinitely.
   *
   * @param gameId The game to update.
   * @param playerId Player whose locks should all be released.
   * @returns Updated locks payload for broadcast.
   */
  unlockAllForPlayer(gameId: number, playerId: number): ICellLocksPayload {
    const state = this.liveGames.get(gameId);
    if (!state) return { locks: [] };
    for (const [key, lock] of state.locks.entries()) {
      if (lock.playerId === playerId) {
        const [r, c] = key.split(',').map(Number);
        this.cancelLockTimer(gameId, r, c);
        state.locks.delete(key);
      }
    }
    return this.getLocksPayload(gameId);
  }

  /**
   * Returns all non-expired soft locks for a game as a broadcast-ready payload.
   *
   * @param gameId The game to query.
   * @returns Payload containing every active lock.
   */
  getLocksPayload(gameId: number): ICellLocksPayload {
    const state = this.liveGames.get(gameId);
    if (!state) return { locks: [] };
    const now = Date.now();
    const locks: ICellLocksPayload['locks'] = [];
    for (const [key, lock] of state.locks.entries()) {
      if (lock.expiresAt > now) {
        const [r, c] = key.split(',').map(Number);
        locks.push({ row: r, col: c, ...lock });
      }
    }
    return { locks };
  }

  /**
   * Cancels the auto-expire timer for a specific cell lock.
   * Called when a cell is released manually before expiry.
   *
   * @param gameId Game ID.
   * @param row Cell row.
   * @param col Cell column.
   */
  cancelLockTimer(gameId: number, row: number, col: number): void {
    const key = this.lockTimerKey(gameId, row, col);
    const timer = this.lockTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.lockTimers.delete(key);
    }
  }

  // ─── Private timer management ───────────────────────────────────────────────

  private lockTimerKey(gameId: number, row: number, col: number): string {
    return `${gameId}:${row}:${col}`;
  }

  /**
   * Schedules an automatic lock expiry, replacing any existing timer for the same cell.
   * When the timer fires, the lock is removed and the callback broadcasts the update.
   *
   * @param gameId Game ID.
   * @param row Cell row.
   * @param col Cell column.
   * @param playerId Player who holds the lock.
   * @param expiresAt Expiry timestamp (used to calculate timeout duration).
   * @param onExpire Callback to broadcast updated locks after expiry.
   */
  private scheduleLockExpiry(
    gameId: number,
    row: number,
    col: number,
    playerId: number,
    expiresAt: number,
    onExpire: (payload: ICellLocksPayload) => void,
  ): void {
    const key = this.lockTimerKey(gameId, row, col);
    this.cancelLockTimer(gameId, row, col); // Clear any existing timer

    const timeout = Math.max(0, expiresAt - Date.now());
    const timer = setTimeout(() => {
      this.lockTimers.delete(key);
      const payload = this.unlockCell(gameId, row, col, playerId);
      onExpire(payload);
    }, timeout);

    this.lockTimers.set(key, timer);
  }
}
