import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import {
  COURT_COLS,
  COURT_ROWS,
  PLAYER_COLOURS,
  WORDS_IN_GAME,
  estimateIntroDurationMs,
} from './word-soup.constants';
import {
  generateTrueCourt,
  normalizeVocabularyWords,
} from './word-soup-placement-engine';
import { resolveEmbeddedWordHintKey } from './word-soup-guess-helpers';

type LoadedGame = Awaited<ReturnType<WordSoupService['loadGame']>>;

type UnfreezeHandler = (gameId: number, playerId: number) => void;

@Injectable()
export class WordSoupService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly sharedCourts = new Map<number, SharedWordSoupCourt>();
  private readonly freezeTimers = new Map<string, NodeJS.Timeout>();
  /** Per-game singleflight so concurrent initCourt calls share one board. */
  private readonly initInFlight = new Map<
    number,
    Promise<SharedWordSoupCourt>
  >();
  private unfreezeHandler: UnfreezeHandler | null = null;

  /**
   * Registers the gateway callback used when freeze timers expire
   * (including timers restored after reconnect / initCourt).
   */
  setUnfreezeHandler(handler: UnfreezeHandler): void {
    this.unfreezeHandler = handler;
  }

  /**
   * Initialise the game court if none exists for gameId; otherwise return the
   * existing shared court. Concurrent callers are coalesced via singleflight.
   */
  async initCourt(
    gameId: number,
    playerId: number,
  ): Promise<WordSoupGameState> {
    const court = await this.getOrCreateCourt(gameId);

    if (!court.playerColours[playerId] && !(playerId in court.playerScores)) {
      const isMember = await this.prisma.gamePlayer.count({
        where: { gameId, playerId },
      });
      if (!isMember) {
        throw new BadRequestException('You are not a player in this game.');
      }
    }

    this.ensureFreezeTimers(gameId, court);
    return this.buildGameState(court, playerId);
  }

  private async getOrCreateCourt(gameId: number): Promise<SharedWordSoupCourt> {
    const cached = this.sharedCourts.get(gameId);
    if (cached) {
      this.ensureCourtDefaults(cached);
      return cached;
    }

    const inflight = this.initInFlight.get(gameId);
    if (inflight) {
      return inflight;
    }

    const createPromise = this.createCourt(gameId).finally(() => {
      this.initInFlight.delete(gameId);
    });
    this.initInFlight.set(gameId, createPromise);
    return createPromise;
  }

  private ensureCourtDefaults(court: SharedWordSoupCourt): void {
    if (!court.playerStreaks) court.playerStreaks = {};
    if (!court.playerBestWordStreaks) court.playerBestWordStreaks = {};
    if (!court.playerFreezeCounts) court.playerFreezeCounts = {};
    if (!court.leftPlayers) court.leftPlayers = {};
    if (!court.introStartedAt) court.introStartedAt = Date.now();
    if (!court.playStartedAt) {
      court.playStartedAt =
        court.introStartedAt +
        estimateIntroDurationMs(court.solutionWords.map((item) => item.word));
    }
  }

  private async createCourt(gameId: number): Promise<SharedWordSoupCourt> {
    const existing = this.sharedCourts.get(gameId);
    if (existing) {
      this.ensureCourtDefaults(existing);
      return existing;
    }

    const game = await this.loadGame(gameId);

    if (game.isFinished) {
      throw new BadRequestException('This game has already finished.');
    }

    const playerIds = this.getPlayerIds(game);
    const selectedWords = this.selectWords(game);
    const { trueCourt, placedWords } = generateTrueCourt(selectedWords);

    if (placedWords.length === 0) {
      throw new BadRequestException(
        'Could not place any vocabulary words on the board.',
      );
    }

    const visibleCourt = this.generateVisibleCourt(trueCourt);
    const introStartedAt = Date.now();

    const sharedCourt: SharedWordSoupCourt = {
      trueCourt,
      visibleCourt,
      playerColours: this.createPlayerColours(playerIds),
      playerScores: this.createPlayerScores(playerIds),
      playerWordCounts: this.createPlayerWordCounts(playerIds),
      playerStreaks: this.createPlayerStreaks(playerIds),
      playerBestWordStreaks: this.createPlayerStreaks(playerIds),
      playerFreezeCounts: this.createPlayerStreaks(playerIds),
      leftPlayers: {},
      solutionWords: placedWords,
      foundWords: [],
      frozenUntil: {},
      isIntroAlreadyShown: this.createIntroShownState(playerIds),
      introStartedAt,
      playStartedAt:
        introStartedAt +
        estimateIntroDurationMs(placedWords.map((item) => item.word)),
    };

    this.sharedCourts.set(gameId, sharedCourt);
    return sharedCourt;
  }

  /** Evict in-memory court and cancel freeze timers for a finished/abandoned game. */
  clearCourt(gameId: number): void {
    const court = this.sharedCourts.get(gameId);
    if (court) {
      for (const playerIdStr of Object.keys(court.frozenUntil)) {
        this.cancelFreezeTimer(gameId, Number(playerIdStr));
      }
    }
    this.sharedCourts.delete(gameId);
    this.initInFlight.delete(gameId);
  }

  /**
   * Returns the epoch ms when the Word Soup play clock started, or null if
   * this game has no loaded court (e.g. Word Building).
   */
  getPlayStartedAt(gameId: number): number | null {
    const court = this.sharedCourts.get(gameId);
    if (!court) return null;
    this.ensureCourtDefaults(court);
    return court.playStartedAt;
  }

  /**
   * Writes in-memory Word Soup scores, word counts, freeze counts, and peak
   * word-finding streaks to GamePlayer. Also raises Player.bestWordStreak when
   * a new peak is set (solo and multiplayer).
   * No-op when the court is not loaded (e.g. already evicted).
   */
  async persistScores(gameId: number): Promise<void> {
    const court = this.sharedCourts.get(gameId);
    if (!court) return;

    const playerIds = Object.keys(court.playerScores).map(Number);
    if (playerIds.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      const completed = this.isCourtComplete(court);
      for (const playerId of playerIds) {
        const peak = court.playerBestWordStreaks[playerId] ?? 0;
        await tx.gamePlayer.update({
          where: { gameId_playerId: { gameId, playerId } },
          data: {
            score: court.playerScores[playerId] ?? 0,
            bestWordStreak: peak,
            wordsFound: court.playerWordCounts[playerId] ?? 0,
            freezeCount: court.playerFreezeCounts[playerId] ?? 0,
            completed,
          },
        });

        // Peak word streak should be tracked for solo and multiplayer.
        if (peak > 0) {
          await tx.player.updateMany({
            where: { id: playerId, bestWordStreak: { lt: peak } },
            data: { bestWordStreak: peak },
          });
        }
      }
    });
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

  private createIntroShownState(playerIds: number[]) {
    return Object.fromEntries(playerIds.map((id) => [id, false]));
  }

  private createPlayerColours(playerIds: number[]) {
    const colours = this.shuffle([...PLAYER_COLOURS]);

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

  private createPlayerStreaks(playerIds: number[]): Record<number, number> {
    return Object.fromEntries(playerIds.map((id) => [id, 0]));
  }

  /**
   * Marks a player as having left mid-game so the scoreboard can show them as gone.
   * Evicts the court when every rostered player has left.
   */
  markPlayerLeft(
    gameId: number,
    playerId: number,
    playerName: string,
  ): WordSoupGameState | null {
    const court = this.sharedCourts.get(gameId);
    if (!court) return null;

    court.leftPlayers[playerId] = playerName;
    court.playerStreaks[playerId] = 0;
    this.cancelFreezeTimer(gameId, playerId);
    delete court.frozenUntil[playerId];

    const state = this.buildGameState(court, playerId);

    const rosterIds = Object.keys(court.playerScores).map(Number);
    const allLeft =
      rosterIds.length > 0 &&
      rosterIds.every((id) => Boolean(court.leftPlayers[id]));
    if (allLeft) {
      this.clearCourt(gameId);
    }

    return state;
  }

  getScoreboardMeta(gameId: number): {
    playerStreaks: Record<number, number>;
    leftPlayers: Record<number, string>;
  } | null {
    const court = this.sharedCourts.get(gameId);
    if (!court) return null;
    return {
      playerStreaks: { ...court.playerStreaks },
      leftPlayers: { ...court.leftPlayers },
    };
  }

  private fillRandom(court: CourtCell[][]): CourtCell[][] {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let r = 0; r < COURT_ROWS; r++) {
      for (let c = 0; c < COURT_COLS; c++) {
        if (court[r][c].char === '') {
          court[r][c] = {
            char: letters[Math.floor(Math.random() * letters.length)],
          };
        }
      }
    }
    return court;
  }

  private generateVisibleCourt(trueCourt: CourtCell[][]): CourtCell[][] {
    const visibleCourt = this.cloneCourt(trueCourt);
    this.fillRandom(visibleCourt);
    return visibleCourt;
  }

  private getPlayerIds(game: LoadedGame): number[] {
    return game.gamePlayers.map((gp) => gp.playerId).sort((a, b) => a - b);
  }

  private getSelectionDirection(
    selection: Array<{ row: number; col: number }>,
  ): [number, number] | null {
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
      throw new NotFoundException(`Game ${gameId} not found.`);
    }

    return game;
  }

  private selectWords(game: LoadedGame): string[] {
    const vocabulary = normalizeVocabularyWords(
      game.group.currentVocabulary?.words ?? [],
    );

    if (vocabulary.length === 0) {
      throw new BadRequestException(
        'Vocabulary has no placeable words (need A–Z letters that fit the board).',
      );
    }

    return this.shuffle(vocabulary).slice(0, WORDS_IN_GAME);
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private isCourtComplete(court: SharedWordSoupCourt): boolean {
    return (
      court.solutionWords.length > 0 &&
      court.foundWords.length >= court.solutionWords.length
    );
  }

  submitGuess(
    gameId: number,
    playerId: number,
    selection: Position[],
  ): GuessResult {
    const court = this.sharedCourts.get(gameId);

    if (!court) {
      return { success: false, message: 'Game not found' };
    }

    if (this.isCourtComplete(court)) {
      return { success: false, message: 'This game is already complete.' };
    }

    if (this.isPlayerFrozen(court, playerId)) {
      const secondsLeft = this.getFrozenSecondsRemaining(court, playerId);
      return {
        success: false,
        message: `You're frozen for ${secondsLeft} more second${secondsLeft === 1 ? '' : 's'}! 🧊`,
        frozen: true,
        frozenUntil: court.frozenUntil[playerId],
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
        message:
          'Selection must be in a straight line (either right->left or top->bottom',
      };
    }

    const startNode = normalisedSelection[0];
    const endNode = normalisedSelection[normalisedSelection.length - 1];
    const guessMinR = Math.min(startNode.row, endNode.row);
    const guessMaxR = Math.max(startNode.row, endNode.row);
    const guessMinC = Math.min(startNode.col, endNode.col);
    const guessMaxC = Math.max(startNode.col, endNode.col);
    const [derivedDx, derivedDy] = direction;

    // Match by placed coordinates so a substring of a longer phrase
    // (e.g. FOOTBALL inside AMERICAN FOOTBALL) cannot claim another word.
    const matchedWordMeta = court.solutionWords.find((solution) => {
      const solMinR = Math.min(solution.startRow, solution.endRow);
      const solMaxR = Math.max(solution.startRow, solution.endRow);
      const solMinC = Math.min(solution.startCol, solution.endCol);
      const solMaxC = Math.max(solution.startCol, solution.endCol);

      const boundsMatch =
        guessMinR === solMinR &&
        guessMaxR === solMaxR &&
        guessMinC === solMinC &&
        guessMaxC === solMaxC;

      if (!boundsMatch) return false;
      if (solution.word.length !== normalisedSelection.length) return false;

      const [sDx, sDy] = solution.direction;
      return (
        Math.abs(derivedDx) === Math.abs(sDx) &&
        Math.abs(derivedDy) === Math.abs(sDy)
      );
    });

    if (!matchedWordMeta) {
      const embeddedHint = this.getEmbeddedWordHint(
        court,
        normalisedSelection,
      );
      if (embeddedHint) {
        return embeddedHint;
      }
      return this.penalizeIncorrectGuess(gameId, playerId);
    }

    const alreadyFound = court.foundWords.some(
      (found) =>
        found.word === matchedWordMeta.word &&
        Math.min(found.cells[0].row, found.cells[found.cells.length - 1].row) ===
          guessMinR &&
        Math.min(found.cells[0].col, found.cells[found.cells.length - 1].col) ===
          guessMinC,
    );

    if (alreadyFound) {
      return { success: false, message: 'Already found' };
    }

    const [tDx, tDy] = matchedWordMeta.direction;
    const targetCells: Position[] = Array.from(
      { length: matchedWordMeta.word.length },
      (_, i) => ({
        row: matchedWordMeta.startRow + i * tDx,
        col: matchedWordMeta.startCol + i * tDy,
      }),
    );

    court.foundWords.push({
      word: matchedWordMeta.word,
      playerId,
      cells: targetCells,
      direction: matchedWordMeta.direction,
    });
    this.addScoreForPlayer(court, playerId, POINTS_PER_WORD);
    court.playerWordCounts[playerId] =
      (court.playerWordCounts[playerId] ?? 0) + 1;
    court.playerStreaks[playerId] = (court.playerStreaks[playerId] ?? 0) + 1;
    court.playerBestWordStreaks[playerId] = Math.max(
      court.playerBestWordStreaks[playerId] ?? 0,
      court.playerStreaks[playerId],
    );

    targetCells.forEach(({ row, col }) => {
      court.visibleCourt[row][col] = {
        ...court.visibleCourt[row][col],
        highlightedByPlayerId: playerId,
      };
    });

    const solved = this.isCourtComplete(court);

    return {
      success: true,
      word: matchedWordMeta.word,
      cells: targetCells,
      direction: matchedWordMeta.direction,
      playerScores: court.playerScores,
      solved,
      state: this.buildGameState(court, playerId),
    };
  }

  /**
   * Detects selecting a full solution word that is embedded inside a longer
   * placed phrase (e.g. TENNIS within TABLE TENNIS). Those near-misses should
   * not freeze the player — they get a hint instead.
   */
  private getEmbeddedWordHint(
    court: SharedWordSoupCourt,
    selection: Position[],
  ): Extract<GuessResult, { success: false }> | null {
    const messageKey = resolveEmbeddedWordHintKey(
      court.solutionWords,
      court.foundWords,
      court.trueCourt,
      selection,
    );
    if (!messageKey) return null;

    return {
      success: false,
      messageKey,
      message:
        messageKey === 'alreadyFoundElsewhere'
          ? 'Good guess, but the word has already been found somewhere else in the grid!'
          : "Good guess, but the word's position is incorrect - see if you can find it elsewhere in the grid!",
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

  private isPlayerFrozen(
    court: SharedWordSoupCourt,
    playerId: number,
  ): boolean {
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

  markIntroShown(gameId: number, playerId: number): void {
    const court = this.sharedCourts.get(gameId);
    if (!court) {
      throw new NotFoundException(`Court ${gameId} not initialized`);
    }
    court.isIntroAlreadyShown[playerId] = true;
  }

  freezePlayer(gameId: number, playerId: number): number {
    const court = this.sharedCourts.get(gameId);
    if (!court) {
      throw new NotFoundException(`Court ${gameId} not initialized`);
    }

    const frozenUntil = Date.now() + FREEZE_DURATION_SECONDS * 1000;
    court.frozenUntil[playerId] = frozenUntil;
    court.playerFreezeCounts[playerId] =
      (court.playerFreezeCounts[playerId] ?? 0) + 1;

    this.scheduleUnfreeze(
      gameId,
      playerId,
      FREEZE_DURATION_SECONDS * 1000,
      () => {
        delete court.frozenUntil[playerId];
        this.unfreezeHandler?.(gameId, playerId);
      },
    );

    return frozenUntil;
  }

  private scheduleUnfreeze(
    gameId: number,
    playerId: number,
    delayMs: number,
    onFire: () => void,
  ): void {
    this.cancelFreezeTimer(gameId, playerId);
    const key = this.freezeTimerKey(gameId, playerId);
    const timer = setTimeout(() => {
      this.freezeTimers.delete(key);
      onFire();
    }, delayMs);
    this.freezeTimers.set(key, timer);
  }

  private penalizeIncorrectGuess(
    gameId: number,
    playerId: number,
  ): GuessResult {
    const court = this.sharedCourts.get(gameId);
    if (court) {
      court.playerStreaks[playerId] = 0;
    }
    const frozenUntil = this.freezePlayer(gameId, playerId);
    return {
      success: false,
      message: 'Oops! Wrong word — chill for a bit! 🧊',
      frozen: true,
      frozenUntil,
    };
  }

  /**
   * Recreate missing freeze timers after process restart / late init.
   * Uses the registered unfreeze handler so clients still get `game:playerUnfrozen`.
   */
  private ensureFreezeTimers(gameId: number, court: SharedWordSoupCourt): void {
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
      this.scheduleUnfreeze(gameId, playerId, remainingMs, () => {
        delete court.frozenUntil[playerId];
        this.unfreezeHandler?.(gameId, playerId);
      });
    }
  }

  private buildGameState(
    court: SharedWordSoupCourt,
    playerId: number,
  ): WordSoupGameState {
    return {
      visibleCourt: this.cloneCourt(court.visibleCourt),
      playerColours: this.clonePlayerColours(court.playerColours),
      playerScores: { ...court.playerScores },
      playerWordCounts: { ...court.playerWordCounts },
      playerStreaks: { ...court.playerStreaks },
      leftPlayers: { ...court.leftPlayers },
      solutionWords: court.solutionWords.map((item) => item.word),
      foundWords: court.foundWords.map((found) => ({
        word: found.word,
        playerId: found.playerId,
        cells: found.cells.map((cell) => ({
          row: cell.row,
          col: cell.col,
        })),
        direction: [...found.direction] as Direction,
      })),
      frozenPlayers: this.getActiveFrozenPlayers(court),
      hasPlayerSeenIntro: court.isIntroAlreadyShown[playerId] ?? false,
      introStartedAt: court.introStartedAt,
      playStartedAt: court.playStartedAt,
      isComplete: this.isCourtComplete(court),
    };
  }
}
