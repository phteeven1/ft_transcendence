import { forwardRef, Inject } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GamesService, Game } from './games.service';
import { WordBuildingService } from './word_building/word-building.service';
import type { IPlaceLetterDto, ILockCellDto } from './word_building/word-building.types';
import { CELL_LOCK_TIMEOUT_MS } from './word_building/word-building.types';

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(forwardRef(() => GamesService))
    private readonly gamesService: GamesService,
    private readonly wordBuildingService: WordBuildingService,
  ) {}

  /**
   * Joins a client to the lobby room for a group and returns the current lobby state.
   * This keeps the lobby view synchronized across all parent clients.
   *
   * @param client The connected socket to register.
   * @param data Group and player identifiers supplied by the client.
   */
  @SubscribeMessage('joinGroup')
  async handleJoinGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: number; playerId: number },
  ) {
    client.join(`group:${data.groupId}`);
    client.data.groupId = data.groupId;
    client.data.playerId = data.playerId;
    const games = await this.gamesService.findByGroup(data.groupId);
    client.emit('lobby:update', { games });
  }

  /**
   * Joins a client to the in-game room used for live crossword updates.
   *
   * @param client The connected socket to register.
   * @param data Game and player identifiers supplied by the client.
   */
  @SubscribeMessage('joinGame')
  handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: number; playerId: number },
  ) {
    client.join(`game:${data.gameId}`);
    client.data.gameId = data.gameId;
    client.data.playerId = data.playerId;
  }

  /**
   * Relays a revealed-tile event to every player in the game room.
   * The backend keeps no tile state for this path; it only coordinates the shared view.
   *
   * @param client The connected socket that triggered the event.
   * @param data Tile coordinates and player metadata from the client.
   */
  @SubscribeMessage('tile:click')
  handleTileClick(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: number; playerId: number; row: number; col: number },
  ) {
    this.server.to(`game:${data.gameId}`).emit('game:tileRevealed', {
      row: data.row,
      col: data.col,
      playerId: data.playerId,
    });
  }

  /**
   * Handles socket disconnects: releases all soft cell locks held by the player.
   *
   * @param client The disconnected socket.
   */
  handleDisconnect(client: Socket) {
    const { gameId, playerId } = client.data as { gameId?: number; playerId?: number };
    if (gameId && playerId) {
      // Word Building: release all locks for this player and notify the room.
      // Guard: only emit if there were active locks — prevents noisy broadcasts
      // to word_soup rooms that have no locking at all.
      const payload = this.wordBuildingService.unlockAllForPlayer(gameId, playerId);
      if (payload.locks.length > 0) {
        this.server.to(`game:${gameId}`).emit('cell:locks', payload);
      }
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
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: IPlaceLetterDto,
  ): Promise<void> {
    const payload = await this.wordBuildingService.placeLetter(dto);
    if (!payload) return;

    // Word Building: cancel the lock timer for this cell (service already cleared the lock).
    this.wordBuildingService.cancelLockTimer(dto.gameId, dto.row, dto.col);

    // Broadcast the updated visible court to every player in the game room.
    this.server.to(`game:${dto.gameId}`).emit('game:state', payload);

    // Broadcast updated locks (placement cleared the reservation for this cell).
    const locksPayload = this.wordBuildingService.getLocksPayload(dto.gameId);
    this.server.to(`game:${dto.gameId}`).emit('cell:locks', locksPayload);

    // If the puzzle is now solved, delegate to GamesService.finish() which:
    //   - sets isActive=false on the game
    //   - clears currentGame on all players
    //   - broadcasts a lobby update so the finished game disappears from the lobby
    //   - emits game:finished to the game room
    if (payload.solved) {
      await this.gamesService.finish(dto.gameId);
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
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ILockCellDto,
  ): void {
    const expiresAt = Date.now() + CELL_LOCK_TIMEOUT_MS;
    // Pass broadcast callback to service so it can emit when timer fires
    const payload = this.wordBuildingService.lockCell(
      dto.gameId,
      dto.row,
      dto.col,
      dto.playerId,
      dto.playerName,
      expiresAt,
      (locksPayload) => {
        this.server.to(`game:${dto.gameId}`).emit('cell:locks', locksPayload);
      },
    );
    this.server.to(`game:${dto.gameId}`).emit('cell:locks', payload);
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
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { gameId: number; playerId: number; row: number; col: number },
  ): void {
    const payload = this.wordBuildingService.unlockCell(dto.gameId, dto.row, dto.col, dto.playerId);
    this.server.to(`game:${dto.gameId}`).emit('cell:locks', payload);
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
  emitGameFinished(gameId: number) {
    this.server.to(`game:${gameId}`).emit('game:finished');
  }

  /**
   * Broadcasts an arbitrary game-state payload to every client in the game room.
   *
   * @param gameId The target game room.
   * @param state The payload to emit.
   */
  emitGameState(gameId: number, state: unknown) {
    this.server.to(`game:${gameId}`).emit('game:state', state);
  }
}
