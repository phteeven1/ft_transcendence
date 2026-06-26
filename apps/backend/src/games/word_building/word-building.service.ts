//
// Integrates:
//   - WordBuildingPuzzleEngine crossword generation
//   - Letter placement with correct/wrong/empty validation
//   - First-correct-placer scoring via creditGrid
//   - In-memory live state with DB persistence on solve
//
// Court dimensions must stay in sync with game-court.tsx on the frontend.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WordBuildingPuzzleEngine } from './word-building-puzzle-engine';
import {
  ClueEntry,
  ClueMap,
  CourtCell,
  IGameStatePayload,
  IInitCourtResponse,
  ILiveGameState,
  IPlaceLetterDto,
} from './word-building.types';

// Keep in sync with game-court.tsx (COURT_COLS / COURT_ROWS)
const COURT_COLS = 18;
const COURT_ROWS = 18;

@Injectable()
export class WordBuildingService {
  private readonly logger = new Logger(WordBuildingService.name);
  /** In-memory live state, keyed by gameId. Evicted on puzzle completion. */
  private readonly liveGames = new Map<number, ILiveGameState>();

  constructor(private readonly prisma: PrismaService) {}

  // ─── initCourt ─────────────────────────────────────────────────────────────
  /**
   * Called by POST /games/:id/initWordBuildingCourt on scaffold mount.
   * Runs WordBuildingPuzzleEngine, persists Crossword row, returns trueCourt + visibleCourt.
   * Idempotent: if a Crossword row already exists for this game, reloads it.
   */
  async initCourt(gameId: number): Promise<IInitCourtResponse> {
    const existing = await this.prisma.crossword.findUnique({ where: { gameId } });
    if (existing) return this.rehydrateInitResponse(existing);

    const game = await this.prisma.game.findUniqueOrThrow({
      where: { id: gameId },
      include: { group: { include: { currentVocabulary: true } } },
    });

    const vocab = game.group.currentVocabulary;
    if (!vocab) throw new Error(`No active vocabulary for group ${game.inGroupId}`);

    const entries = vocab.words.map((word: string, i: number) => ({
      word,
      clue: vocab.meanings[i] ?? '',
    }));

    const engine = new WordBuildingPuzzleEngine(Math.min(COURT_COLS, COURT_ROWS), 80, 12);
    const result = engine.generate(entries);

    const solution   = this.padGrid(result.solution, COURT_ROWS, COURT_COLS);
    const playerGrid = solution.map(row => row.map(() => null as string | null));
    const clues      = this.buildClueMap(result.placements);

    await this.prisma.crossword.create({
      data: {
        gameId,
        rows:       COURT_ROWS,
        cols:       COURT_COLS,
        solution:   solution   as unknown as object,
        playerGrid: playerGrid as unknown as object,
        creditGrid: playerGrid as unknown as object,  // same shape, all null
        clues:      clues      as unknown as object,
        revision:   0,
        solved:     false,
      },
    });

    return this.buildInitResponse(solution, clues);
  }

  // ─── placeLetter ───────────────────────────────────────────────────────────
  /**
   * Called by the placeLetter WebSocket event.
   * Validates, scores, and returns an updated IGameStatePayload for broadcast.
   * Returns null if the cell is a black square (no-op).
   */
  async placeLetter(dto: IPlaceLetterDto): Promise<IGameStatePayload | null> {
    const { gameId, playerId, row, col, letter } = dto;
    const normalized = letter.normalize('NFC').toUpperCase().replace(/[^\p{L}]/gu, '');
    if (!normalized) return null;

    const state = await this.loadOrHydrate(gameId);

    // Ignore clicks on black squares
    if (state.solution[row]?.[col] === null) return null;

    state.playerGrid[row][col] = normalized;
    state.revision++;

    const isCorrect      = normalized === state.solution[row][col];
    const alreadyCredited = state.creditGrid[row][col] !== null;

    // First correct placer wins permanently
    if (isCorrect && !alreadyCredited) {
      state.creditGrid[row][col] = playerId;
      state.scores.set(playerId, (state.scores.get(playerId) ?? 0) + 1);
    }

    const payload = this.buildPayload(state);

    if (payload.solved) {
      await this.persistCompletion(gameId, state);
    }

    return payload;
  }

  // ─── getState ──────────────────────────────────────────────────────────────
  /**
   * Called by GET /games/:id/wordBuildingState — used when a player reconnects
   * mid-game and needs the current grid state without re-running initCourt.
   */
  async getState(gameId: number): Promise<IGameStatePayload> {
    const state = await this.loadOrHydrate(gameId);
    return this.buildPayload(state);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /**
   * Builds the live payload sent to the client after a letter placement or reconnect.
   * This keeps clue numbers, scores, and solved state in sync with the authoritative grid.
   *
   * @param state Current in-memory crossword state.
   * @returns The websocket payload broadcast to the game room.
   */
  private buildPayload(state: ILiveGameState): IGameStatePayload {
    const { solution, playerGrid, creditGrid, scores, revision, clues } = state;
    const rows = solution.length;
    const cols = solution[0]?.length ?? 0;

    const { offsetRow, offsetCol } = this.getBoardOffset(solution);
    const clueNumberMap = new Map<string, number>();
    for (const entry of [...clues.across, ...clues.down]) {
      clueNumberMap.set(`${entry.row + offsetRow},${entry.col + offsetCol}`, entry.number);
    }

    let allCorrect = true;
    const visibleCourt: CourtCell[][] = [];

    for (let r = 0; r < rows; r++) {
      const row: CourtCell[] = [];
      for (let c = 0; c < cols; c++) {
        const solutionLetter = solution[r][c];
        const placed         = playerGrid[r][c];
        const clueNumber     = clueNumberMap.get(`${r},${c}`);
        const cn             = clueNumber ? { clueNumber } : {};

        if (solutionLetter === null) {
          row.push({ char: '', status: 'none' });
          continue;
        }

        if (placed === null) {
          allCorrect = false;
          row.push({ char: '', status: 'empty', ...cn });
        } else if (placed === solutionLetter) {
          row.push({ char: placed, status: 'correct', placedBy: creditGrid[r][c] ?? undefined, ...cn });
        } else {
          allCorrect = false;
          row.push({ char: placed, status: 'wrong', ...cn });
        }
      }
      visibleCourt.push(row);
    }

    return {
      visibleCourt,
      scores:  Array.from(scores.entries()).map(([pid, score]) => ({ playerId: pid, score })),
      solved:  allCorrect,
      revision,
    };
  }

  /**
   * Builds the initial REST response used by the scaffold when a crossword is first created.
   * The method pads clue coordinates into the visible board so the client can render numbers.
   *
   * @param solution Trimmed crossword solution grid.
   * @param clues Clue metadata produced by the engine.
   * @returns The initial trueCourt/visibleCourt payload sent on mount.
   */
  private buildInitResponse(
    solution: (string | null)[][],
    clues:    ClueMap,
  ): IInitCourtResponse {
    const { offsetRow, offsetCol } = this.getBoardOffset(solution);
    const clueNumberMap = new Map<string, number>();
    for (const entry of [...clues.across, ...clues.down]) {
      clueNumberMap.set(`${entry.row + offsetRow},${entry.col + offsetCol}`, entry.number);
    }

    const rows = solution.length;
    const cols = solution[0]?.length ?? 0;

    const trueCourt: CourtCell[][] = [];
    const visibleCourt: CourtCell[][] = [];

    for (let r = 0; r < rows; r++) {
      const trueRow:    CourtCell[] = [];
      const visibleRow: CourtCell[] = [];

      for (let c = 0; c < cols; c++) {
        const letter     = solution[r][c];
        const clueNumber = clueNumberMap.get(`${r},${c}`);

        if (letter === null) {
          trueRow.push({ char: '', status: 'none' });
          visibleRow.push({ char: '', status: 'none' });
        } else {
          trueRow.push({ char: letter, status: 'correct', ...(clueNumber ? { clueNumber } : {}) });
          visibleRow.push({ char: '', status: 'empty', ...(clueNumber ? { clueNumber } : {}) });
        }
      }
      trueCourt.push(trueRow);
      visibleCourt.push(visibleRow);
    }

    const sanitizedClues = {
      across: clues.across.map(({ word: _w, row, col, ...rest }) => ({
        ...rest,
        row: row + offsetRow,
        col: col + offsetCol,
      })),
      down: clues.down.map(({ word: _w, row, col, ...rest }) => ({
        ...rest,
        row: row + offsetRow,
        col: col + offsetCol,
      })),
    };

    return { trueCourt, visibleCourt, clues: sanitizedClues };
  }

  /**
   * Reconstructs the initial response from a persisted crossword row.
   * This is used when a client reconnects and the crossword already exists in the database.
   *
   * @param crossword Persisted crossword row from Prisma.
   * @returns The initial court payload rebuilt from stored state.
   */
  private rehydrateInitResponse(crossword: {
    solution:    unknown;
    playerGrid:  unknown;
    creditGrid:  unknown;
    clues:       unknown;
  }): IInitCourtResponse {
    const solution   = crossword.solution   as (string | null)[][];
    const playerGrid = crossword.playerGrid as (string | null)[][];
    const clues      = crossword.clues      as ClueMap;

    const { offsetRow, offsetCol } = this.getBoardOffset(solution);
    const clueNumberMap = new Map<string, number>();
    for (const entry of [...clues.across, ...clues.down]) {
      clueNumberMap.set(`${entry.row + offsetRow},${entry.col + offsetCol}`, entry.number);
    }

    const rows = solution.length;
    const cols = solution[0]?.length ?? 0;

    const trueCourt: CourtCell[][] = [];
    const visibleCourt: CourtCell[][] = [];

    for (let r = 0; r < rows; r++) {
      const trueRow:    CourtCell[] = [];
      const visibleRow: CourtCell[] = [];

      for (let c = 0; c < cols; c++) {
        const letter     = solution[r][c];
        const placed     = playerGrid[r][c];
        const clueNumber = clueNumberMap.get(`${r},${c}`);
        const cn         = clueNumber ? { clueNumber } : {};

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
      across: clues.across.map(({ word: _w, row, col, ...rest }) => ({
        ...rest,
        row: row + offsetRow,
        col: col + offsetCol,
      })),
      down: clues.down.map(({ word: _w, row, col, ...rest }) => ({
        ...rest,
        row: row + offsetRow,
        col: col + offsetCol,
      })),
    };

    return { trueCourt, visibleCourt, clues: sanitizedClues };
  }

  /**
   * Loads the live crossword state from memory or hydrates it from the database on demand.
   *
   * @param gameId Game whose state should be loaded.
   * @returns The mutable in-memory state used by placement and state refresh paths.
   */
  private async loadOrHydrate(gameId: number): Promise<ILiveGameState> {
    if (this.liveGames.has(gameId)) return this.liveGames.get(gameId)!;

    const crossword = await this.prisma.crossword.findUniqueOrThrow({
      where: { gameId },
      include: { game: { include: { gamePlayers: true } } },
    });

    const solution   = crossword.solution   as (string | null)[][];
    const playerGrid = crossword.playerGrid as (string | null)[][];
    const rows = solution.length;
    const cols = solution[0]?.length ?? 0;

    const creditGrid: (number | null)[][] = crossword.creditGrid
      ? (crossword.creditGrid as (number | null)[][])
      : Array.from({ length: rows }, () => Array<number | null>(cols).fill(null));

    const scores = new Map<number, number>();
    for (const gp of crossword.game.gamePlayers) {
      scores.set(gp.playerId, gp.score);
    }

    const state: ILiveGameState = {
      solution,
      playerGrid,
      creditGrid,
      scores,
      clues:    crossword.clues as ClueMap,
      revision: crossword.revision,
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
  private async persistCompletion(gameId: number, state: ILiveGameState): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.crossword.update({
        where: { gameId },
        data: {
          playerGrid: state.playerGrid as unknown as object,
          creditGrid: state.creditGrid as unknown as object,
          solved:     true,
          revision:   state.revision,
        },
      }),
      ...Array.from(state.scores.entries()).map(([playerId, score]) =>
        this.prisma.gamePlayer.update({
          where: { gameId_playerId: { gameId, playerId } },
          data:  { score },
        }),
      ),
      this.prisma.game.update({
        where: { id: gameId },
        data:  { isFinished: true },
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

    const padded: (string | null)[][] = Array.from(
      { length: targetRows },
      () => Array<string | null>(targetCols).fill(null),
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
      word: string; clue: string;
      row: number; col: number;
      direction: string; number: number;
    }>,
  ): ClueMap {
    const across: ClueEntry[] = [];
    const down:   ClueEntry[] = [];

    for (const p of placements) {
      const entry: ClueEntry = {
        number:    p.number,
        clue:      p.clue,
        row:       p.row,
        col:       p.col,
        direction: p.direction as 'across' | 'down',
        word:      p.word,
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
  private getBoardOffset(solution: (string | null)[][]): { offsetRow: number; offsetCol: number } {
    let offsetRow = 0;
    let offsetCol = 0;

    for (let r = 0; r < solution.length; r++) {
      if (solution[r].some(cell => cell !== null)) {
        offsetRow = r;
        break;
      }
    }

    for (let c = 0; c < (solution[0]?.length ?? 0); c++) {
      if (solution.some(row => row[c] !== null)) {
        offsetCol = c;
        break;
      }
    }

    return { offsetRow, offsetCol };
  }
}