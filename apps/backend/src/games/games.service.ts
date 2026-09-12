import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { gameWithPlayers, toApiGame } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { PlayersService } from '../players/players.service';
import { ProgressionService } from '../progression/progression.service';
import { getMaxUnlockedTier } from '../progression/progression.helpers';
import type { GameFinishOutcome } from '../progression/progression.types';
import {
  GAME_TYPE_WORD_BUILDING,
  GAME_TYPE_WORD_SOUP,
  matchLeaderboardGameType,
} from '../progression/progression.constants';
import { GameGateway } from './game.gateway';
import { WordSoupService } from './word_soup/word-soup.service';
import { WordBuildingService } from './word_building/word-building.service';
import { GAME_LOBBY_CONFIG } from './game-lobby.config';

export type Game = {
  id: number;
  name: string;
  inGroup: number;
  initiatedBy: number;
  initiatedTime: Date;
  startedTime: Date | null;
  players: number[];
  isActive: boolean;
  isFinished: boolean;
  maxPlayers: number;
  autoStartAt: string | null;
};

export type FinishGameResponse = {
  game: Game;
  outcome: GameFinishOutcome | null;
};

@Injectable()
export class GamesService implements OnModuleInit, OnModuleDestroy {
  private sweepTimer: ReturnType<typeof setInterval> | null = null;
  private sweeping = false;
  // Set at the start of onModuleDestroy(). Guards against an in-flight async
  // operation (rescheduleAutoStartTimers()'s DB query, a create() call still
  // awaiting its insert) resolving AFTER shutdown and scheduling a new timer
  // that onModuleDestroy()'s own clear-everything loop already ran past.
  private destroyed = false;
  // Per-game precise auto-start timers, keyed by gameId. These are what
  // actually fire a WAITING game's start at (initiatedTime + autoStartTimeoutMs)
  // — see the class doc comment on scheduleAutoStart() for why the periodic
  // sweep alone isn't enough for that.
  private readonly autoStartTimers = new Map<
    number,
    ReturnType<typeof setTimeout>
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly playersService: PlayersService,
    private readonly progressionService: ProgressionService,
    @Inject(forwardRef(() => GameGateway))
    private readonly gateway: GameGateway,
    private readonly wordSoupService: WordSoupService,
    private readonly wordBuildingService: WordBuildingService,
  ) {}

  onModuleInit(): void {
    void this.rescheduleAutoStartTimers();
    void this.runSweep();
    this.sweepTimer = setInterval(() => {
      void this.runSweep();
    }, GAME_LOBBY_CONFIG.sweepIntervalMs);
  }

  onModuleDestroy(): void {
    this.destroyed = true;
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    for (const timer of this.autoStartTimers.values()) clearTimeout(timer);
    this.autoStartTimers.clear();
  }

  /**
   * Schedules a precise one-shot check for one game's auto-start deadline
   * (initiatedTime + autoStartTimeoutMs), instead of relying solely on the
   * periodic sweep to notice it. The sweep's setInterval is anchored to
   * server boot time, not to any individual game's initiatedTime — a game
   * created at an arbitrary phase relative to that fixed tick schedule only
   * gets checked on the NEXT tick after its deadline, adding up to a full
   * sweepIntervalMs of unnecessary delay (variable, not fixed — confirmed
   * empirically: with a 400ms sweep interval, observed overshoot ranged
   * ~74–343ms across trials). This timer fires at the actual deadline
   * instead; the sweep remains as a reliability backstop (crash recovery,
   * a missed/lost timer) via rescheduleAutoStartTimers() on boot and its
   * own periodic due-game scan, so nothing regresses if this timer is ever
   * lost.
   *
   * @param gameId Game to schedule.
   * @param initiatedTime The game's creation time the deadline is anchored to.
   */
  private scheduleAutoStart(gameId: number, initiatedTime: Date): void {
    if (this.destroyed) return;
    this.clearAutoStartTimer(gameId);
    const dueAt =
      initiatedTime.getTime() + GAME_LOBBY_CONFIG.autoStartTimeoutMs;
    const delay = Math.max(0, dueAt - Date.now());
    const timer = setTimeout(() => {
      this.autoStartTimers.delete(gameId);
      this.tryAutoStartOne(gameId).catch((error: unknown) => {
        console.error(`Scheduled auto-start failed for game ${gameId}`, error);
      });
    }, delay);
    this.autoStartTimers.set(gameId, timer);
  }

  /** Cancels a game's pending precise auto-start timer, if any. Safe to call for a game with no timer scheduled. */
  private clearAutoStartTimer(gameId: number): void {
    const timer = this.autoStartTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      this.autoStartTimers.delete(gameId);
    }
  }

  /**
   * Re-arms precise auto-start timers for every currently WAITING game on
   * boot, so a process restart doesn't fall back to periodic-sweep-only
   * timing for games that were already waiting. A deadline already in the
   * past schedules with delay 0 — fires on the next tick instead of waiting
   * for the sweep.
   */
  private async rescheduleAutoStartTimers(): Promise<void> {
    const pending = await this.prisma.game.findMany({
      where: { isActive: false, isFinished: false },
      select: { id: true, initiatedTime: true },
    });
    for (const g of pending) {
      this.scheduleAutoStart(g.id, g.initiatedTime);
    }
  }

  /**
   * Fired by a game's precise auto-start timer. Re-checks fresh state (the
   * game may have already started, been cancelled, or lost players since the
   * timer was scheduled) before acting — startGame() is idempotent regardless,
   * but this avoids an unnecessary write attempt. Never cancels: a game that
   * still lacks minPlayersToStart is left for the periodic sweep's separate
   * cancellation-timeout check, matching the existing "these are two
   * different timers" rule.
   */
  private async tryAutoStartOne(gameId: number): Promise<void> {
    const game = await this.findById(gameId);
    if (!game || game.isActive || game.isFinished) return;
    if (game.players.length < GAME_LOBBY_CONFIG.minPlayersToStart) return;
    await this.startGame(game);
  }

  /**
   * Authoritative background lifecycle sweep — the only place a WAITING or
   * STARTED game gets resolved when no client is around to trigger it (a
   * closed browser, an expired session, or a timed-out lobby). Runs on its
   * own timer rather than any browser timer so it works with zero connected
   * clients. Re-entrancy guarded so a slow tick can't overlap the next one.
   */
  private async runSweep(): Promise<void> {
    if (this.sweeping || this.destroyed) return;
    this.sweeping = true;
    try {
      await this.reapAbandonedPlayers();
      await this.sweepPendingGames();
    } catch (error) {
      console.error('GamesService background sweep failed', error);
    } finally {
      this.sweeping = false;
    }
  }

  /**
   * Finds players whose session has genuinely expired (not merely a
   * disconnected socket — reconnects with a still-valid session are
   * unaffected) and routes them through the exact same `leave()` used for an
   * explicit Leave click. This is the single mechanism behind both waiting-game
   * owner transfer/cancellation and started-game abandonment cleanup — no
   * separate logic is needed for either, `leave()` already handles both.
   */
  private async reapAbandonedPlayers(): Promise<void> {
    const reaped = await this.playersService.reapExpiredSessions();
    for (const { playerId } of reaped) {
      const memberships = await this.prisma.gamePlayer.findMany({
        where: { playerId, leftAt: null },
        select: { gameId: true },
      });
      for (const { gameId } of memberships) {
        try {
          await this.leave(gameId, playerId);
        } catch (error) {
          console.error(
            `Sweep: leave() failed for expired player ${playerId} in game ${gameId}`,
            error,
          );
        }
      }
    }
  }

  /**
   * Resolves WAITING games that have outlived the auto-start timeout: starts
   * them if they still meet the minimum-player requirement, otherwise
   * cancels them once they've also outlived the (longer, separate)
   * cancellation timeout. A game that fails the start requirement but hasn't
   * yet hit the cancellation cutoff is left waiting.
   */
  private async sweepPendingGames(): Promise<void> {
    const now = Date.now();
    const startCutoff = new Date(now - GAME_LOBBY_CONFIG.autoStartTimeoutMs);
    const cancelCutoff = new Date(
      now - GAME_LOBBY_CONFIG.cancellationTimeoutMs,
    );

    const due = await this.prisma.game.findMany({
      where: {
        isActive: false,
        isFinished: false,
        initiatedTime: { lte: startCutoff },
      },
      include: { gamePlayers: true },
    });

    for (const g of due) {
      if (g.gamePlayers.length >= GAME_LOBBY_CONFIG.minPlayersToStart) {
        const game = await this.findById(g.id);
        if (game && !game.isActive && !game.isFinished) {
          await this.startGame(game);
        }
      } else if (g.initiatedTime <= cancelCutoff) {
        await this.cancelWaitingGame(g.id);
      }
    }
  }

  /**
   * Hard-deletes a WAITING game that never reached start conditions. Mirrors
   * the existing convention elsewhere in this file (startGame()'s empty-lobby
   * sweep, leave()'s empty-game delete) of not persisting a separate
   * cancelled/expired status for a game that never actually started.
   * Conditional on the where clause so it safely no-ops if the game was
   * already started or removed by another path in the meantime.
   */
  private async cancelWaitingGame(gameId: number): Promise<void> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { gamePlayers: true },
    });
    if (!game || game.isActive || game.isFinished) return;

    const { count } = await this.prisma.game.deleteMany({
      where: { id: gameId, isActive: false, isFinished: false },
    });
    if (count !== 1) return;

    this.clearAutoStartTimer(gameId);
    for (const gp of game.gamePlayers) {
      await this.playersService.clearCurrentGame(gp.playerId);
    }
    await this.emitLobbyUpdate(game.inGroupId);
  }

  /**
   * Creates a new game, adds the initiating player to it, and refreshes the lobby view.
   *
   * @param name Display name for the game.
   * @param inGroup Group that owns the game.
   * @param initiatedBy Player id of the creator.
   * @returns The created game in API shape.
   */
  async create(
    name: string,
    inGroup: number,
    initiatedBy: number,
  ): Promise<Game> {
    const game = await this.prisma.game.create({
      data: {
        name,
        inGroupId: inGroup,
        initiatedById: initiatedBy,
        gamePlayers: { create: { playerId: initiatedBy } },
      },
      ...gameWithPlayers,
    });
    await this.playersService.setCurrentGame(initiatedBy, game.id);
    this.scheduleAutoStart(game.id, game.initiatedTime);
    const result = toApiGame(game);
    await this.emitLobbyUpdate(inGroup);
    return result;
  }

  /**
   * Adds a player to a pending game when the game is still joinable and not
   * already at the configured player cap. Runs the capacity check and the
   * insert inside one transaction, row-locking the Game so two concurrent
   * joins for the same game can never both squeeze past the limit (Postgres'
   * default Read Committed isolation would otherwise let two transactions
   * both read the same pre-join count). If the join fills the last seat, the
   * game is flipped to active in the same locked transaction so the max-
   * players-reached auto-start can never be missed or double-fired either.
   *
   * @param gameId Game to join.
   * @param playerId Player joining the game.
   * @returns The updated game, or `undefined` if joining is not allowed.
   * @throws ConflictException if the game is already at its player cap.
   */
  async join(gameId: number, playerId: number): Promise<Game | undefined> {
    type JoinOutcome =
      | { kind: 'unjoinable' }
      | { kind: 'full' }
      | { kind: 'already-in' }
      | { kind: 'joined'; inGroupId: number; autoStarted: boolean };

    const outcome = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        {
          id: number;
          inGroupId: number;
          isActive: boolean;
          isFinished: boolean;
        }[]
      >`SELECT "id", "inGroupId", "isActive", "isFinished" FROM "Game" WHERE "id" = ${gameId} FOR UPDATE`;
      const game = rows[0];
      if (!game || game.isActive || game.isFinished) {
        return { kind: 'unjoinable' } satisfies JoinOutcome;
      }

      const existing = await tx.gamePlayer.findUnique({
        where: { gameId_playerId: { gameId, playerId } },
      });
      if (existing) return { kind: 'already-in' } satisfies JoinOutcome;

      const count = await tx.gamePlayer.count({ where: { gameId } });
      if (count >= GAME_LOBBY_CONFIG.maxPlayers) {
        return { kind: 'full' } satisfies JoinOutcome;
      }

      await tx.gamePlayer.create({ data: { gameId, playerId } });

      const autoStarted = count + 1 >= GAME_LOBBY_CONFIG.maxPlayers;
      if (autoStarted) {
        await tx.game.update({
          where: { id: gameId },
          data: { isActive: true, startedTime: new Date() },
        });
      }
      return {
        kind: 'joined',
        inGroupId: game.inGroupId,
        autoStarted,
      } satisfies JoinOutcome;
    });

    if (outcome.kind === 'unjoinable') return undefined;
    if (outcome.kind === 'full') {
      throw new ConflictException('This game is already full');
    }
    if (outcome.kind === 'already-in') return this.findById(gameId);

    await this.playersService.setCurrentGame(playerId, gameId);

    if (outcome.autoStarted) {
      this.clearAutoStartTimer(gameId);
      const started = await this.findById(gameId);
      if (started) await this.applyStartSideEffects(started);
    } else {
      await this.emitLobbyUpdate(outcome.inGroupId);
    }
    return this.findById(gameId);
  }

  /**
   * Starts a pending game and promotes it into the active play state.
   *
   * @param gameId Game to start.
   * @returns The updated game, or `undefined` if it cannot be started.
   */
  async start(gameId: number): Promise<Game | undefined> {
    const game = await this.findById(gameId);
    if (!game) return undefined;
    await this.startGame(game);
    return this.findById(gameId);
  }

  /**
   * Removes a player from a game and deletes the game when it becomes empty.
   * This keeps lobby state and ownership consistent when participants leave.
   *
   * @param gameId Game to leave.
   * @param playerId Player leaving the game.
   * @returns The updated game, `null` if the game was removed, or `undefined` when missing.
   */
  async leave(
    gameId: number,
    playerId: number,
  ): Promise<Game | null | undefined> {
    const game = await this.findById(gameId);
    if (!game) return undefined;

    // Leaving is a per-player action: it must only affect the player who left,
    // never the others. Active matches keep every participant's GamePlayer row
    // (set leftAt) so recent games / scores survive. In-memory services track
    // who is still playing; the match finishes once every participant has left.
    const leaderboardType = matchLeaderboardGameType(game.name);
    if (
      game.isActive &&
      (leaderboardType === GAME_TYPE_WORD_BUILDING ||
        leaderboardType === GAME_TYPE_WORD_SOUP)
    ) {
      const roster = await this.findPlayersForGame(gameId);
      const playerName =
        roster.find((player) => player.id === playerId)?.name ??
        `Player #${playerId}`;
      await this.playersService.clearCurrentGame(playerId);

      if (leaderboardType === GAME_TYPE_WORD_BUILDING) {
        const { allLeft, leftPlayers } =
          await this.wordBuildingService.markPlayerLeft(
            gameId,
            playerId,
            playerName,
          );
        if (allLeft) {
          const result = await this.finish(gameId);
          return result?.game ?? null;
        }
        await this.emitLobbyUpdate(game.inGroup);
        this.gateway.emitPlayerLeft(gameId, playerId, playerName, leftPlayers);
        return this.findById(gameId);
      }

      // Word Soup — durable leftAt + in-memory leftPlayers
      const soupState = await this.wordSoupService.markPlayerLeft(
        gameId,
        playerId,
        playerName,
      );
      const leftPlayers = soupState?.leftPlayers ?? { [playerId]: playerName };

      const remaining = await this.prisma.gamePlayer.count({
        where: { gameId, leftAt: null },
      });
      if (remaining === 0 || this.wordSoupService.hasAllPlayersLeft(gameId)) {
        const result = await this.finish(gameId);
        return result?.game ?? null;
      }

      await this.emitLobbyUpdate(game.inGroup);
      this.gateway.emitPlayerLeft(gameId, playerId, playerName, leftPlayers);
      return this.findById(gameId);
    }

    if (
      game.isActive &&
      game.players.length === 1 &&
      game.players[0] === playerId
    ) {
      const result = await this.finish(gameId);
      return result?.game ?? null;
    }

    const wasActive = game.isActive;
    let playerName = `Player #${playerId}`;
    if (wasActive) {
      const roster = await this.findPlayersForGame(gameId);
      playerName =
        roster.find((player) => player.id === playerId)?.name ?? playerName;
    }

    await this.prisma.gamePlayer.deleteMany({
      where: { gameId, playerId },
    });
    await this.playersService.clearCurrentGame(playerId);

    const emitLeftIfActive = (): void => {
      if (wasActive) {
        this.gateway.emitPlayerLeft(gameId, playerId, playerName);
      }
    };

    const updated = await this.findById(gameId);
    if (!updated || updated.players.length === 0) {
      await this.prisma.game.delete({ where: { id: gameId } }).catch(() => {});
      this.clearAutoStartTimer(gameId);
      await this.emitLobbyUpdate(game.inGroup);
      emitLeftIfActive();
      return null;
    }

    // if the initiator left and others remain, promote the first remaining player
    if (game.initiatedBy === playerId && updated.players.length > 0) {
      await this.prisma.game.update({
        where: { id: gameId },
        data: { initiatedById: updated.players[0] },
      });
    }

    await this.emitLobbyUpdate(game.inGroup);
    emitLeftIfActive();
    return this.findById(gameId);
  }

  /**
   * Looks up one game by id and converts it into the API response shape.
   *
   * @param gameId Game id to fetch.
   * @returns The matching game, or `undefined` if it does not exist.
   */
  async findById(gameId: number): Promise<Game | undefined> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      ...gameWithPlayers,
    });
    return game ? toApiGame(game) : undefined;
  }

  async isPlayerInGame(gameId: number, playerId: number): Promise<boolean> {
    const count = await this.prisma.gamePlayer.count({
      where: { gameId, playerId, leftAt: null },
    });
    return count > 0;
  }

  /**
   * Returns all games that belong to a single group.
   *
   * @param groupId Group id to filter by.
   * @returns The list of games in that group.
   */
  async findByGroup(groupId: number): Promise<Game[]> {
    const games = await this.prisma.game.findMany({
      where: { inGroupId: groupId },
      ...gameWithPlayers,
    });
    return games.map(toApiGame);
  }

  /**
   * Returns the player roster for one game for scoreboard rendering.
   *
   * @param gameId Game whose players should be listed.
   * @returns Player ids, names, XP-derived rank, and equipped animal.
   */
  async findPlayersForGame(gameId: number): Promise<
    Array<{
      id: number;
      name: string;
      avatarTier: number;
      avatarAnimal: number;
    }>
  > {
    const gamePlayers = await this.prisma.gamePlayer.findMany({
      where: { gameId },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            xp: true,
            avatarAnimal: true,
          },
        },
      },
    });
    return gamePlayers.map((gp) => ({
      id: gp.player.id,
      name: gp.player.name,
      avatarTier: getMaxUnlockedTier(gp.player.xp),
      avatarAnimal: gp.player.avatarAnimal,
    }));
  }

  /**
   * Promotes a pending game to active status and runs its start side
   * effects. Idempotent: the flip is a conditional update that only
   * succeeds if the game was still pending, so a game already started (by a
   * concurrent max-players auto-start, a concurrent manual force-start, or a
   * concurrent sweep tick) safely does nothing on a second call — no
   * duplicate `game:started` emit, no duplicate state initialization.
   *
   * @param game Game to start.
   */
  private async startGame(game: Game): Promise<void> {
    const claimed = await this.prisma.game.updateMany({
      where: { id: game.id, isActive: false, isFinished: false },
      data: { isActive: true, startedTime: new Date() },
    });
    if (claimed.count !== 1) return;

    this.clearAutoStartTimer(game.id);
    await this.applyStartSideEffects(game);
  }

  /**
   * Everything that must happen once a game has been flipped to active:
   * stealing the starting players out of any other pending lobbies they were
   * still sitting in, resetting currentGameId, sweeping up any pending games
   * left empty by that, and emitting the start/lobby events. Split out from
   * startGame() so join()'s max-players auto-start (which flips isActive
   * itself, inside its own row-locked transaction) can reuse this without
   * re-running — or racing — the idempotent flip above.
   *
   * @param game Game that has already been flipped to active.
   */
  private async applyStartSideEffects(game: Game): Promise<void> {
    for (const pId of game.players) {
      await this.playersService.clearCurrentGame(pId);

      const otherPending = await this.prisma.game.findMany({
        where: {
          isActive: false,
          isFinished: false,
          id: { not: game.id },
          gamePlayers: { some: { playerId: pId } },
        },
        include: { gamePlayers: true },
      });

      for (const other of otherPending) {
        await this.prisma.gamePlayer.deleteMany({
          where: { gameId: other.id, playerId: pId },
        });

        const count = await this.prisma.gamePlayer.count({
          where: { gameId: other.id },
        });

        if (count === 0) {
          await this.prisma.game.delete({ where: { id: other.id } });
          this.clearAutoStartTimer(other.id);
        } else {
          // if the leaving player was the initiator, promote the first remaining player
          if (other.initiatedById === pId) {
            const firstRemaining = await this.prisma.gamePlayer.findFirst({
              where: { gameId: other.id },
            });
            if (firstRemaining) {
              await this.prisma.game.update({
                where: { id: other.id },
                data: { initiatedById: firstRemaining.playerId },
              });
            }
          }
        }
      }
    }

    for (const pId of game.players) {
      await this.playersService.setCurrentGame(pId, game.id);
    }

    const emptyPendingWhere = {
      isActive: false,
      isFinished: false,
      gamePlayers: { none: {} },
    };
    const emptyPending = await this.prisma.game.findMany({
      where: emptyPendingWhere,
      select: { id: true },
    });
    for (const { id } of emptyPending) {
      this.clearAutoStartTimer(id);
    }
    await this.prisma.game.deleteMany({ where: emptyPendingWhere });

    // Emit after all DB work is done
    const started = await this.findById(game.id);
    if (started) {
      this.gateway.emitGameStarted(game.inGroup, started);
      await this.emitLobbyUpdate(game.inGroup);
    }
  }

  /**
   * Pushes the refreshed lobby game list to the websocket gateway.
   *
   * @param groupId Group whose lobby should be refreshed.
   */
  private async emitLobbyUpdate(groupId: number): Promise<void> {
    const games = await this.findByGroup(groupId);
    this.gateway.emitLobbyUpdate(groupId, games);
  }

  /**
   * Returns finish scores and XP awards for a completed game.
   */
  async getFinishOutcome(gameId: number): Promise<GameFinishOutcome | null> {
    return this.progressionService.getFinishOutcome(gameId);
  }

  /**
   * Marks the intro as seen for one player (Word Soup or Word Building).
   */
  async markIntroShown(
    gameId: number,
    playerId: number,
  ): Promise<{ ok: true }> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: { name: true },
    });
    if (!game) {
      throw new NotFoundException(`Game ${gameId} not found`);
    }

    const gameType = matchLeaderboardGameType(game.name);
    if (gameType === GAME_TYPE_WORD_SOUP) {
      this.wordSoupService.markIntroShown(gameId, playerId);
    } else if (gameType === GAME_TYPE_WORD_BUILDING) {
      this.wordBuildingService.markIntroShown(gameId, playerId);
    } else {
      throw new NotFoundException(`Game ${gameId} does not support intro sync`);
    }
    return { ok: true };
  }

  /**
   * Marks a game as finished, persists final scores, applies progression once,
   * clears player session state, and emits the end-game event.
   *
   * @param gameId Game to finish.
   * @returns The updated game and finish outcome, or `undefined` if missing.
   */
  async finish(gameId: number): Promise<FinishGameResponse | undefined> {
    const dbGame = await this.prisma.game.findUnique({
      where: { id: gameId },
      ...gameWithPlayers,
    });
    if (!dbGame) return undefined;

    if (dbGame.isFinished && dbGame.progressionAppliedAt) {
      const result = await this.findById(gameId);
      if (!result) return undefined;
      const outcome = await this.progressionService.getFinishOutcome(gameId);
      return { game: result, outcome };
    }

    await this.wordSoupService.persistScores(gameId);
    await this.wordBuildingService.persistScores(gameId);

    const now = new Date();
    const soupPlayStartedAt = this.wordSoupService.getPlayStartedAt(gameId);
    const buildingPlayStartedAt =
      this.wordBuildingService.getPlayStartedAt(gameId);
    const playStartedAtMs =
      soupPlayStartedAt ??
      buildingPlayStartedAt ??
      dbGame.playStartedAt?.getTime() ??
      dbGame.startedTime?.getTime() ??
      dbGame.initiatedTime.getTime();
    const playStartedAt = new Date(playStartedAtMs);
    const durationMs = Math.max(0, now.getTime() - playStartedAtMs);

    await this.prisma.game.update({
      where: { id: gameId },
      data: {
        isFinished: true,
        isActive: false,
        endedAt: dbGame.endedAt ?? now,
        playStartedAt: dbGame.playStartedAt ?? playStartedAt,
        durationMs: dbGame.durationMs ?? durationMs,
      },
    });

    const awardProgression = await this.isProgressionEligible(
      gameId,
      dbGame.name,
    );
    const outcome = awardProgression
      ? await this.progressionService.recordGameOutcome(gameId)
      : await this.progressionService.getUnrewardedFinishOutcome(gameId);

    const game = toApiGame(dbGame);
    for (const pId of game.players) {
      await this.playersService.clearCurrentGame(pId);
    }
    const result = await this.findById(gameId);
    if (!result) return undefined;
    await this.emitLobbyUpdate(game.inGroup);
    this.gateway.emitGameFinished(gameId, outcome);
    this.wordSoupService.clearCourt(gameId);
    this.wordBuildingService.clearLiveGame(gameId);
    return { game: result, outcome };
  }

  /**
   * Progression (XP, wins, streaks) applies only when the puzzle was fully solved.
   */
  private async isProgressionEligible(
    gameId: number,
    gameName: string,
  ): Promise<boolean> {
    const gameType = matchLeaderboardGameType(gameName);
    if (gameType === GAME_TYPE_WORD_SOUP) {
      if (this.wordSoupService.isGameComplete(gameId)) return true;
      const completedPlayer = await this.prisma.gamePlayer.findFirst({
        where: { gameId, completed: true },
        select: { playerId: true },
      });
      return completedPlayer != null;
    }
    if (gameType === GAME_TYPE_WORD_BUILDING) {
      const crossword = await this.prisma.crossword.findUnique({
        where: { gameId },
        select: { solved: true },
      });
      return crossword?.solved ?? false;
    }
    return false;
  }
}
