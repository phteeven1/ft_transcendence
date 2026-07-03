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
import type { IPlaceLetterDto } from './word_building/word-building.types';

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
   * Handles socket disconnects and preserves the socket metadata for future cleanup logic.
   * The current implementation only records the event and defers room teardown.
   *
   * @param client The disconnected socket.
   */
  handleDisconnect(client: Socket) {
    // client.data.playerId, client.data.groupId, client.data.gameId available here.
    // Disconnect handling (leave pending games) goes here later.
  }

  /**
   * Accepts a letter placement from one player, persists the update, and rebroadcasts the
   * authoritative crossword state to the whole game room.
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

    // Broadcast the updated visible court to every player in the game room.
    this.server.to(`game:${dto.gameId}`).emit('game:state', payload);

    // If the puzzle is now solved, fire game:finished so all clients redirect.
    if (payload.solved) {
      this.server.to(`game:${dto.gameId}`).emit('game:finished', { scores: payload.scores });
    }
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
