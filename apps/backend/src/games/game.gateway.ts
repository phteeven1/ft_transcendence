import { forwardRef, Inject, OnModuleInit } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket, type DefaultEventsMap } from 'socket.io';
import { GamesService, Game } from './games.service';
import type { GameFinishOutcome } from '../progression/progression.types';
import { WordBuildingService } from './word_building/word-building.service';
import { WordSoupService } from './word_soup/word-soup.service';
import { UsersService } from '../users/users.service';
import { PlayersService } from '../players/players.service';
import {
  FREEZE_DURATION_SECONDS,
  POINTS_PER_WORD,
} from './word_soup/word-soup.types';
import type {
  IPlaceLetterDto,
  ILockCellDto,
} from './word_building/word-building.types';
import { CELL_LOCK_TIMEOUT_MS } from './word_building/word-building.types';

interface SocketData {
  groupId?: number;
  playerId?: number;
  gameId?: number;
  userId?: number;
}

type TypedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

function joinedPlayer(client: TypedSocket): number | undefined {
  return client.data.playerId;
}

function joinedGame(client: TypedSocket): number | undefined {
  return client.data.gameId;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(forwardRef(() => GamesService))
    private readonly gamesService: GamesService,
    private readonly wordBuildingService: WordBuildingService,
    private readonly wordSoupService: WordSoupService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => PlayersService))
    private readonly playersService: PlayersService,
  ) {}

  onModuleInit(): void {
    this.wordSoupService.setUnfreezeHandler((gameId, playerId) => {
      void this.broadcastPlayerUnfrozen(gameId, playerId);
    });
  }

  /**
   * Joins a client to the lobby room for a group and returns the current lobby state.
   * This keeps the lobby view synchronized across all parent clients.
   *
   * @param client The connected socket to register.
   * @param data Group and player identifiers supplied by the client.
   */
  @SubscribeMessage('joinSession')
  async handleJoinSession(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody()
    data: { kind: 'user' | 'player'; id: number; token: string },
  ): Promise<void> {
    if (!data?.token || !Number.isInteger(data.id) || data.id <= 0) return;
    try {
      if (data.kind === 'user') {
        await this.usersService.validateSession(data.id, data.token);
        await client.join(`user:${data.id}`);
        client.data.userId = data.id;
        return;
      }
      await this.playersService.validateSession(data.id, data.token);
      await client.join(`player:${data.id}`);
      client.data.playerId = data.id;
    } catch {
      client.emit('session:replaced');
    }
  }

  @SubscribeMessage('joinGroup')
  async handleJoinGroup(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody()
    data: { groupId: number; playerId: number; token: string },
  ): Promise<void> {
    try {
      await this.playersService.validateSession(data.playerId, data.token);
    } catch {
      client.emit('session:replaced');
      return;
    }

    await client.join(`group:${data.groupId}`);
    await client.join(`player:${data.playerId}`);

    client.data.groupId = data.groupId;
    client.data.playerId = data.playerId;

    const games = await this.gamesService.findByGroup(data.groupId);

    client.emit('lobby:update', { games });
  }

  @SubscribeMessage('joinDashboard')
  async handleJoinDashboard(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { groupId: number; userId: number; token: string },
  ): Promise<void> {
    if (!Number.isInteger(data.userId) || data.userId <= 0) return;

    try {
      await this.usersService.validateSession(data.userId, data.token);
    } catch {
      client.emit('session:replaced');
      return;
    }

    await client.join(`user:${data.userId}`);
    client.data.userId = data.userId;

    const previousGroupId = client.data.groupId;
    if (previousGroupId && previousGroupId !== data.groupId) {
      await client.leave(`group:${previousGroupId}`);
    }

    if (Number.isInteger(data.groupId) && data.groupId > 0) {
      await client.join(`group:${data.groupId}`);
      client.data.groupId = data.groupId;
    } else {
      client.data.groupId = undefined;
    }
  }

  emitDashboardUpdate(groupId: number): void {
    this.server.to(`group:${groupId}`).emit('dashboard:update');
  }

  emitMembershipChanged(userId: number): void {
    this.server.to(`user:${userId}`).emit('membership:changed');
  }

  /**
   * Joins a client to the in-game room used for live game updates.
   *
   * @param client The connected socket to register.
   * @param data Game and player identifiers supplied by the client.
   */
  @SubscribeMessage('joinGame')
  async handleJoinGame(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: number; playerId: number; token: string },
  ): Promise<void> {
    try {
      await this.playersService.validateSession(data.playerId, data.token);
    } catch {
      client.emit('session:replaced');
      return;
    }
    await client.join(`game:${data.gameId}`);
    await client.join(`player:${data.playerId}`);
    client.data.gameId = data.gameId;
    client.data.playerId = data.playerId;
  }

  emitUserSessionReplaced(userId: number): void {
    this.server?.to(`user:${userId}`).emit('session:replaced');
  }

  emitPlayerSessionReplaced(playerId: number): void {
    this.server?.to(`player:${playerId}`).emit('session:replaced');
  }

  @SubscribeMessage('guess:submit')
  async handleSubmitGuess(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody()
    data: {
      gameId: number;
      selection: Array<{ row: number; col: number }>;
    },
  ) {
    const playerId = joinedPlayer(client);
    const gameId = joinedGame(client);
    if (!playerId || !gameId) return;

    const isPlayer = await this.gamesService.isPlayerInGame(gameId, playerId);
    if (!isPlayer) {
      client.emit('game:error', {
        message: 'You are not a player in this game.',
      });
      return;
    }

    const result = this.wordSoupService.submitGuess(
      gameId,
      playerId,
      data.selection,
    );

    if (result.success) {
      const playerName = await this.getPlayerName(gameId, playerId);
      this.server
        .to(`game:${gameId}`)
        .emit('game:state', { state: result.state });
      this.server.to(`game:${gameId}`).emit('game:wordGuessed', {
        playerId,
        playerName,
        word: result.word,
        cells: result.cells,
        direction: result.direction,
        pointsEarned: POINTS_PER_WORD,
        playerScores: result.playerScores,
        state: result.state,
      });
      // Always ack the guessing client so FE submitting state cannot stick
      // if celebration / wordGuessed handling fails.
      client.emit('game:guessResult', {
        success: true,
        message: `Found ${result.word}!`,
        word: result.word,
      });

      if (result.solved) {
        await this.gamesService.finish(gameId);
      }
      return;
    }

    client.emit('game:guessResult', {
      success: false,
      message: result.message,
      messageKey: result.messageKey,
      frozen: result.frozen,
      frozenUntil: result.frozenUntil,
    });

    if (result.frozen && result.frozenUntil) {
      void this.broadcastPlayerFrozen(gameId, playerId, result.frozenUntil);
    }
  }

  private async broadcastPlayerFrozen(
    gameId: number,
    playerId: number,
    frozenUntil: number,
  ): Promise<void> {
    const playerName = await this.getPlayerName(gameId, playerId);
    const meta = this.wordSoupService.getScoreboardMeta(gameId);
    this.server.to(`game:${gameId}`).emit('game:playerFrozen', {
      playerId,
      playerName,
      frozenUntil,
      durationSeconds: FREEZE_DURATION_SECONDS,
      playerStreaks: meta?.playerStreaks,
      kind: 'freeze',
    });
  }

  private async broadcastPlayerUnfrozen(
    gameId: number,
    playerId: number,
  ): Promise<void> {
    // Court may already be cleared after solve; still notify the room.
    const playerName = await this.getPlayerName(gameId, playerId);
    const meta = this.wordSoupService.getScoreboardMeta(gameId);
    this.server.to(`game:${gameId}`).emit('game:playerUnfrozen', {
      playerId,
      playerName,
      message: `${playerName} is back in the game! 🎉`,
      kind: 'unfreeze',
      playerStreaks: meta?.playerStreaks,
    });
  }

  private async getPlayerName(
    gameId: number,
    playerId: number,
  ): Promise<string> {
    const players = await this.gamesService.findPlayersForGame(gameId);
    return (
      players.find((player) => player.id === playerId)?.name ??
      `Player #${playerId}`
    );
  }

  /**
   * Handles socket disconnects: releases all soft cell locks held by the player.
   *
   * @param client The disconnected socket.
   */
  handleDisconnect(client: Socket) {
    const { gameId, playerId } = client.data as {
      gameId?: number;
      playerId?: number;
    };
    if (gameId && playerId) {
      // Word Building: release all locks for this player and notify the room.
      const payload = this.wordBuildingService.unlockAllForPlayer(
        gameId,
        playerId,
      );
      this.server.to(`game:${gameId}`).emit('cell:locks', payload);
    }
  }

  /**
   * Accepts a letter placement from one player, persists the update, and rebroadcasts the
   * authoritative crossword state to the whole game room.
   * Also cancels the lock timer and broadcasts updated locks.
   *
   * @param client The connected socket that sent the placement.
   * @param dto Placement payload containing game, player, cell, and letter.
   */
  @SubscribeMessage('placeLetter')
  async handlePlaceLetter(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() dto: IPlaceLetterDto,
  ): Promise<void> {
    const playerId = joinedPlayer(client);
    const gameId = joinedGame(client);
    if (!playerId || !gameId) return;

    const payload = await this.wordBuildingService.placeLetter({
      ...dto,
      gameId,
      playerId,
    });
    if (!payload) return;

    this.wordBuildingService.cancelLockTimer(gameId, dto.row, dto.col);

    // Broadcast the final-letter celebration before `game:state` / `game:finished`
    // so every client can start the celebration on the same authoritative event
    // and hold the scoreboard transition until it has played out.
    if (payload.solved && payload.finalPlacement) {
      const {
        playerId: finalPlayerId,
        letter,
        row,
        col,
      } = payload.finalPlacement;
      const playerName = await this.getPlayerName(gameId, finalPlayerId);
      this.server.to(`game:${gameId}`).emit('game:finalLetterPlaced', {
        playerId: finalPlayerId,
        playerName,
        letter,
        row,
        col,
      });
    }

    this.server.to(`game:${gameId}`).emit('game:state', payload);

    const locksPayload = this.wordBuildingService.getLocksPayload(gameId);
    this.server.to(`game:${gameId}`).emit('cell:locks', locksPayload);

    if (payload.solved) {
      await this.gamesService.finish(gameId);
    }
  }

  /**
   * Reserves a cell for a player and broadcasts the updated lock map.
   * Automatically expires after CELL_LOCK_TIMEOUT_MS if not released.
   * Timer management is delegated to WordBuildingService.
   *
   * @param client The connected socket.
   * @param dto Lock request containing game, player, and cell coordinates.
   */
  @SubscribeMessage('cell:lock')
  handleCellLock(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() dto: ILockCellDto,
  ): void {
    const playerId = joinedPlayer(client);
    const gameId = joinedGame(client);
    if (!playerId || !gameId) return;

    const expiresAt = Date.now() + CELL_LOCK_TIMEOUT_MS;
    const payload = this.wordBuildingService.lockCell(
      gameId,
      dto.row,
      dto.col,
      playerId,
      dto.playerName,
      expiresAt,
      (locksPayload) => {
        this.server.to(`game:${gameId}`).emit('cell:locks', locksPayload);
      },
    );
    this.server.to(`game:${gameId}`).emit('cell:locks', payload);
  }

  /**
   * Releases a player's lock on a cell before the automatic timeout.
   * Timer cancellation is handled by WordBuildingService.
   *
   * @param client The connected socket.
   * @param dto Unlock request containing game, player, and cell coordinates.
   */
  @SubscribeMessage('cell:unlock')
  handleCellUnlock(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody()
    dto: { gameId: number; playerId: number; row: number; col: number },
  ): void {
    const playerId = joinedPlayer(client);
    const gameId = joinedGame(client);
    if (!playerId || !gameId) return;

    const payload = this.wordBuildingService.unlockCell(
      gameId,
      dto.row,
      dto.col,
      playerId,
    );
    this.server.to(`game:${gameId}`).emit('cell:locks', payload);
  }

  /**
   * Broadcasts the latest lobby game list to every client in a group room.
   *
   * @param groupId The group whose lobby should be updated.
   * @param games The refreshed game list to broadcast.
   */
  emitLobbyUpdate(groupId: number, games: Game[]) {
    this.server.to(`group:${groupId}`).emit('lobby:update', { games });
  }

  /**
   * Broadcasts a game-start event to every client in a group room.
   *
   * @param groupId The group whose clients should be notified.
   * @param game The started game payload.
   */
  emitGameStarted(groupId: number, game: Game) {
    this.server.to(`group:${groupId}`).emit('game:started', { game });
  }

  /**
   * Broadcasts that a game has ended to every player currently in the game room.
   * Called after the database has already been updated.
   *
   * @param gameId The finished game id.
   */
  emitGameFinished(gameId: number, outcome: GameFinishOutcome | null) {
    this.server.to(`game:${gameId}`).emit('game:finished', { outcome });
  }

  /**
   * Broadcasts that a player has left the game room mid-play. The game itself
   * keeps running for everyone still in it — this only updates who is shown as
   * having left.
   *
   * @param gameId The game room to notify.
   * @param playerId The player who left.
   * @param playerName Display name captured before leave.
   * @param leftPlayersOverride Precomputed left-player map (playerId → name)
   *   for callers that already tracked this themselves (Word Building); falls
   *   back to Word Soup's own tracking when omitted.
   */
  emitPlayerLeft(
    gameId: number,
    playerId: number,
    playerName: string,
    leftPlayersOverride?: Record<number, string>,
  ) {
    const meta = this.wordSoupService.getScoreboardMeta(gameId);
    this.server.to(`game:${gameId}`).emit('game:playerLeft', {
      playerId,
      playerName,
      leftPlayers: leftPlayersOverride ??
        meta?.leftPlayers ?? { [playerId]: playerName },
      playerStreaks: meta?.playerStreaks,
    });
  }
}
