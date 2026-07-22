import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CourtCell,
  SharedWordSoupCourt,
  Direction,
  Position,
  GuessResult,
  WordSoupGameState,
  FREEZE_DURATION_SECONDS,
  POINTS_PER_WORD,
} from './word-soup.types';

type LoadedGame = Awaited<ReturnType<WordSoupService['loadGame']>>;

// ── Grid dimensions — must match COURT_COLS / COURT_ROWS in game-court.tsx ──
const COURT_COLS = 18;
const COURT_ROWS = 10;

const WORDS_IN_GAME = 10; // number of words from the vocabulary to be used in a game of Word Soup

const MAX_PLACEMENT_ATTEMPTS = 200;

const PLAYER_COLOURS = [
  '#e74c3c',
  '#3498db',
  '#c0ee19',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e67eed',
  '#34495e',
];

const R: Direction = [0, 1]; // right
const D: Direction = [1, 0]; // down

const DIRECTIONS: Direction[] = [R, D];

@Injectable()
export class WordSoupService {
  
  constructor(private readonly prisma: PrismaService) {}

  private readonly sharedCourts = new Map<number, SharedWordSoupCourt>();
  private readonly freezeTimers = new Map<string, NodeJS.Timeout>();

  /* 
    Initialise the game court if no game court exists for gameId
    Otherwise return the existing game court from sharedCourts 

    Return : WordSoupGameState
  */ 
  async initCourt(gameId: number, playerId: number): Promise<WordSoupGameState> {
    
    const game = await this.loadGame(gameId);
    const cached = this.sharedCourts.get(gameId);
    
    if (cached) {
      this.ensureFreezeTimers(gameId, cached);
      return this.buildGameState(cached, playerId);
    }

    const playerIds = this.getPlayerIds(game);
    const playerColours = this.createPlayerColours(playerIds);
    const playerScores = this.createPlayerScores(playerIds);
    const playerWordCounts = this.createPlayerWordCounts(playerIds);

    const selectedWords = this.selectWords(game);
    const trueCourt = this.generateTrueCourt(selectedWords);
    const visibleCourt = this.generateVisibleCourt(trueCourt);
    const isIntroAlreadyShown = this.createIntroShownState(playerIds);

    const sharedCourt: SharedWordSoupCourt = {
      trueCourt,
      visibleCourt,
      playerColours,
      playerScores,
      playerWordCounts,
      solutionWords: selectedWords,
      foundWords: [],
      frozenUntil: {},
      isIntroAlreadyShown,
    };

    this.sharedCourts.set(gameId, sharedCourt);

    return this.buildGameState(sharedCourt, playerId);
  }

  private addScoreForPlayer(
    cached: SharedWordSoupCourt,
    playerId: number,
    points: number,
  ) {
    if (!cached.playerScores[playerId]) {
      cached.playerScores[playerId] = 0;
    }
    cached.playerScores[playerId] += points;
  }

  private canPlace(
    trueCourt: CourtCell[][],
    word: string,
    row: number,
    col: number,
    [dx, dy]: [number, number],
  ): boolean {
    for (let i = 0; i < word.length; i++) {
      const r = row + i * dx;
      const c = col + i * dy;

      if (r < 0 || c < 0 || r >= COURT_ROWS || c >= COURT_COLS) return false;

      const cell = trueCourt[r][c];
      if (cell.char !== '' && cell.char !== word[i]) return false;
    }

    return true;
  }

  private cloneCourt(court: CourtCell[][]): CourtCell[][] {
    return court.map((row) => row.map((cell) => ({ ...cell })));
  }

  private clonePlayerColours(
    playerColours: Record<number, string>,
  ): Record<number, string> {
    return Object.fromEntries(
      Object.entries(playerColours).map(([playerId, colour]) => [
        Number(playerId),
        colour,
      ]),
    );
  }

  private createEmptyCourt(): CourtCell[][] {
    return Array.from({ length: COURT_ROWS }, () =>
      Array.from({ length: COURT_COLS }, () => ({
        char: '',
        revealed: false,
      })),
    );
  }

  private createIntroShownState(playerIds: number[]) {
    
    return Object.fromEntries(
      playerIds.map((id, hasPlayerSeenIntro) => [id, false]),
    );
  }

  private createPlayerColours(playerIds: number[]) {
    const colours = this.shuffle(PLAYER_COLOURS);

    return Object.fromEntries(
      playerIds.map((id, index) => [id, colours[index % colours.length]]),
    );
  }

  private createPlayerScores(playerIds: number[]): Record<number, number> {
    return Object.fromEntries(playerIds.map((id) => [id, 0]));
  }

  private createPlayerWordCounts(playerIds: number[]): Record<number, number> {
    return Object.fromEntries(playerIds.map((id) => [id, 0]));
  }

  private extractWord(trueCourt: CourtCell[][], selection: Position[]): string {
    return selection
      .map(({ row, col }) => trueCourt[row][col]?.char ?? '')
      .join('');
  }

  private fillRandom(court: CourtCell[][]): CourtCell[][] {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let r = 0; r < COURT_ROWS; r++) {
      for (let c = 0; c < COURT_COLS; c++) {
        if (court[r][c].char === '') {
          court[r][c] = {
            char: letters[Math.floor(Math.random() * letters.length)],
            revealed: false,
          };
        }
      }
    }
    return court;
  }

  private generateTrueCourt(words: string[]): CourtCell[][] {
    const trueCourt = this.createEmptyCourt();

    for (const word of words) {
      let placed = false;

      for (
        let attempt = 0;
        attempt < MAX_PLACEMENT_ATTEMPTS && !placed;
        attempt++
      ) {
        const row = Math.floor(Math.random() * COURT_ROWS);
        const col = Math.floor(Math.random() * COURT_COLS);
        const direction =
          DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

        if (this.canPlace(trueCourt, word, row, col, direction)) {
          this.placeWord(trueCourt, word, row, col, direction);
          placed = true;
        }
      }
    }
    return trueCourt;
  }

  private generateVisibleCourt(trueCourt: CourtCell[][]): CourtCell[][] {
    const visibleCourt = this.cloneCourt(trueCourt);

    this.fillRandom(visibleCourt);

    return visibleCourt;
  }

  private getPlayerIds(game: LoadedGame): number[] {
    return game.gamePlayers.map((gp) => gp.playerId).sort((a, b) => a - b);
  }

  private getSelectionDirection( selection: Array<{ row: number; col: number }>,)
    : [number, number] | null 
  {  
    if (selection.length < 2) return null;

    const [first, second] = selection;
    const rowDelta = second.row - first.row;
    const colDelta = second.col - first.col;

    if (rowDelta === 0 && colDelta === 0) return null;
    if (rowDelta !== 0 && colDelta !== 0) return null;
    if (Math.abs(rowDelta) > 1 || Math.abs(colDelta) > 1) return null;

    const oneStepRow = rowDelta === 0 ? 0 : rowDelta / Math.abs(rowDelta);
    const oneStepCol = colDelta === 0 ? 0 : colDelta / Math.abs(colDelta);

    const isStraightLine = selection.every((position, index) => {
      if (index === 0) return true;
      const previous = selection[index - 1];
      const deltaRow = position.row - previous.row;
      const deltaCol = position.col - previous.col;
      if (deltaRow === 0 && deltaCol === 0) return false;
      if (deltaRow !== 0 && deltaCol !== 0) return false;
      if (Math.abs(deltaRow) > 1 || Math.abs(deltaCol) > 1) return false;
      return (
        (deltaRow === 0 || deltaRow === oneStepRow) &&
        (deltaCol === 0 || deltaCol === oneStepCol)
      );
    });

    if (!isStraightLine) return null;

    return [oneStepRow, oneStepCol];
  }

  private async loadGame(gameId: number) {
    
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        group: {
          include: {
            currentVocabulary: true,
          },
        },
        gamePlayers: {
          include: {
            player: true,
          },
        },
      },
    });

    if (!game) {
      throw new Error(`Game ${gameId} not found.`);
    }

    return game;
  }

  private placeWord(
    trueCourt: CourtCell[][],
    word: string,
    row: number,
    col: number,
    [dx, dy]: [number, number],
  ): boolean {
    if (!this.canPlace(trueCourt, word, row, col, [dx, dy])) return false;

    for (let i = 0; i < word.length; i++) {
      const r = row + i * dx;
      const c = col + i * dy;
      trueCourt[r][c] = {
        ...trueCourt[r][c],
        char: word[i],
        revealed: false,
      };
    }

    return true;
  }

  // Select a random subset of words from the vocabulary to be used in the game
  // TODO : Need to consider size of vocabulary list and number of words to be used in the game (WORDS_IN_GAME) to avoid errors
  private selectWords(game: LoadedGame): string[] {
    const vocabulary = (game.group.currentVocabulary?.words ?? [])
      .map((word) => word.trim().toUpperCase())
      .filter(Boolean);

    return this.shuffle(vocabulary).slice(0, WORDS_IN_GAME);
  }

  // Function to shuffle an array using the Fisher-Yates algorithm
  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  async submitGuess(
    gameId: number,
    playerId: number,
    selection: Position[],
    onPlayerUnfrozen?: () => void,
  ): Promise<GuessResult> {
    const court = this.sharedCourts.get(gameId);

    if (!court) {
      return { success: false, message: 'Game not found' };
    }

    if (this.isPlayerFrozen(court, playerId)) {
      const secondsLeft = this.getFrozenSecondsRemaining(court, playerId);
      return {
        success: false,
        message: `You're frozen for ${secondsLeft} more second${secondsLeft === 1 ? '' : 's'}! 🧊`,
      };
    }

    const normalisedSelection = selection.map(({ row, col }) => ({
      row: Number(row),
      col: Number(col),
    }));

    if (!Array.isArray(selection) || selection.length < 2) {
      return {
        success: false,
        message: 'Select at least two letters to make a guess.',
      };
    }

    if (
      normalisedSelection.some(
        ({ row, col }) =>
          !Number.isInteger(row) ||
          !Number.isInteger(col) ||
          row < 0 ||
          col < 0 ||
          row >= COURT_ROWS ||
          col >= COURT_COLS,
      )
    ) {
      return { success: false, message: 'Selection is outside the board.' };
    }

    const direction = this.getSelectionDirection(normalisedSelection);
    if (!direction) {
      return {
        success: false,
        message: 'Selection must be contiguous in one direction.',
      };
    }

    const word = this.extractWord(court.visibleCourt, normalisedSelection).trim();

    if (!word) {
      return this.penalizeIncorrectGuess(gameId, playerId, onPlayerUnfrozen);
    }

    const normalisedWord = word.toUpperCase();
    if (court.foundWords.some(found => found.word === normalisedWord)) {
      return { success: false, message: 'Already found' };
    }

    // Ensure exact match with one of the solution words (defensive: avoid prefix/suffix matches)
    const matchedSolution = court.solutionWords.find(
      (s) => s === normalisedWord,
    );
    if (!matchedSolution) {
      return this.penalizeIncorrectGuess(gameId, playerId, onPlayerUnfrozen);
    }

    // Extra defensive checks: lengths must match and each character must match the solution
    if (normalisedWord.length !== normalisedSelection.length) {
      return this.penalizeIncorrectGuess(gameId, playerId, onPlayerUnfrozen);
    }

    const exactCharMatch = normalisedSelection.every(({ row, col }, idx) => {
      const expectedChar = matchedSolution[idx];
      const actualChar = (court.trueCourt[row][col]?.char ?? '').toUpperCase();
      return actualChar === expectedChar;
    });

    if (!exactCharMatch) {
      return this.penalizeIncorrectGuess(gameId, playerId, onPlayerUnfrozen);
    }

    court.foundWords.push({
      word: normalisedWord,
      playerId,
      cells: normalisedSelection,
      direction,
    });
    this.addScoreForPlayer(court, playerId, POINTS_PER_WORD);
    court.playerWordCounts[playerId] =
      (court.playerWordCounts[playerId] ?? 0) + 1;

    normalisedSelection.forEach(({ row, col }) => {
      court.visibleCourt[row][col] = {
        ...court.visibleCourt[row][col],
        revealed: true,
        highlightedByPlayerId: playerId,
      };
    });

    const solved =
      court.solutionWords.length > 0 &&
      court.foundWords.length >= court.solutionWords.length;

    return {
      success: true,
      word: normalisedWord,
      cells: normalisedSelection,
      direction,
      message: `Correct! +${POINTS_PER_WORD} points`,
      playerScores: court.playerScores,
      solved,
      state: this.buildGameState(court, playerId),
    };
  }

  private freezeTimerKey(gameId: number, playerId: number): string {
    return `${gameId}:${playerId}`;
  }

  private cancelFreezeTimer(gameId: number, playerId: number): void {
    const key = this.freezeTimerKey(gameId, playerId);
    const timer = this.freezeTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.freezeTimers.delete(key);
    }
  }

  private getActiveFrozenPlayers(
    court: SharedWordSoupCourt,
  ): Record<number, number> {
    const now = Date.now();
    const active: Record<number, number> = {};

    for (const [playerId, until] of Object.entries(court.frozenUntil)) {
      if (until > now) {
        active[Number(playerId)] = until;
      } else {
        delete court.frozenUntil[Number(playerId)];
      }
    }

    return active;
  }

  private isPlayerFrozen(court: SharedWordSoupCourt, playerId: number): boolean {
    const until = court.frozenUntil[playerId];
    if (!until) return false;
    if (until <= Date.now()) {
      delete court.frozenUntil[playerId];
      return false;
    }
    return true;
  }

  private getFrozenSecondsRemaining(
    court: SharedWordSoupCourt,
    playerId: number,
  ): number {
    const until = court.frozenUntil[playerId] ?? Date.now();
    return Math.max(1, Math.ceil((until - Date.now()) / 1000));
  }

  markIntroShown(
    gameId : number, 
    playerId: number){
      const court = this.sharedCourts.get(gameId);
      if (!court) {
        throw new Error(`Court ${gameId} not initialized`);
      }
      court.isIntroAlreadyShown[playerId] = true;
  }

  freezePlayer(
    gameId: number,
    playerId: number,
    onUnfreeze?: () => void,
  ): number {
    const court = this.sharedCourts.get(gameId);
    if (!court) {
      throw new Error(`Court ${gameId} not initialized`);
    }

    const frozenUntil = Date.now() + FREEZE_DURATION_SECONDS * 1000;
    court.frozenUntil[playerId] = frozenUntil;

    this.cancelFreezeTimer(gameId, playerId);
    const key = this.freezeTimerKey(gameId, playerId);
    const timer = setTimeout(() => {
      this.freezeTimers.delete(key);
      delete court.frozenUntil[playerId];
      onUnfreeze?.();
    }, FREEZE_DURATION_SECONDS * 1000);
    this.freezeTimers.set(key, timer);

    return frozenUntil;
  }

  private penalizeIncorrectGuess(
    gameId: number,
    playerId: number,
    onPlayerUnfrozen?: () => void,
  ): GuessResult {
    const frozenUntil = this.freezePlayer(gameId, playerId, onPlayerUnfrozen);
    return {
      success: false,
      message: 'Oops! Wrong word — chill for a bit! 🧊',
      frozen: true,
      frozenUntil,
    };
  }

  private ensureFreezeTimers(
    gameId: number,
    court: SharedWordSoupCourt,
  ): void {
    const now = Date.now();

    for (const [playerIdStr, until] of Object.entries(court.frozenUntil)) {
      const playerId = Number(playerIdStr);

      if (until <= now) {
        delete court.frozenUntil[playerId];
        this.cancelFreezeTimer(gameId, playerId);
        continue;
      }

      const key = this.freezeTimerKey(gameId, playerId);
      if (this.freezeTimers.has(key)) {
        continue;
      }

      const remainingMs = until - now;
      const timer = setTimeout(() => {
        this.freezeTimers.delete(key);
        delete court.frozenUntil[playerId];
      }, remainingMs);
      this.freezeTimers.set(key, timer);
    }
  }

  private buildGameState(
    court: SharedWordSoupCourt, 
    playerId: number
  ): WordSoupGameState {
    return {
      visibleCourt: this.cloneCourt(court.visibleCourt),
      playerColours: this.clonePlayerColours(court.playerColours),
      playerScores: { ...court.playerScores },
      playerWordCounts: { ...court.playerWordCounts },
      solutionWords: [...court.solutionWords],
      foundWords: court.foundWords.map(found => ({
        word: found.word,
        playerId: found.playerId,
        cells: found.cells.map(cell => ({
          row: cell.row,
          col: cell.col,
        })),
        direction: [...found.direction] as Direction,
      })),
      frozenPlayers: this.getActiveFrozenPlayers(court),
      hasPlayerSeenIntro: court.isIntroAlreadyShown[playerId] ?? false,
      isComplete:
        court.solutionWords.length > 0 &&
        court.foundWords.length >= court.solutionWords.length,
    };
  }
}
