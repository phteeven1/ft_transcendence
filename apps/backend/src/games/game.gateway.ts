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

@WebSocketGateway({ cors: { origin: '*' } })
export class GameGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(forwardRef(() => GamesService))
    private readonly gamesService: GamesService,
  ) {}

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

  @SubscribeMessage('joinGame')
  handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: number; playerId: number },
  ) {
    client.join(`game:${data.gameId}`);
    client.data.gameId = data.gameId;
  }

  // A player clicked a tile. Broadcast the coordinates to all players in the game room
  // so every client can copy trueCourt[row][col] into their own visibleCourt[row][col].
  // The backend does not store trueCourt — that lives on each client, populated from
  // the vocabulary at mount. The backend is purely a relay here.
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

  handleDisconnect(client: Socket) {
    // client.data.playerId, client.data.groupId, client.data.gameId available here.
    // Disconnect handling (leave pending games) goes here later.
  }

  emitLobbyUpdate(groupId: number, games: Game[]) {
    this.server.to(`group:${groupId}`).emit('lobby:update', { games });
  }

  emitGameStarted(groupId: number, game: Game) {
    this.server.to(`group:${groupId}`).emit('game:started', { game });
  }

  // Broadcasts to all players in the game room that the game has ended.
  // Called by GamesService.finish() after DB is updated.
  emitGameFinished(gameId: number) {
    this.server.to(`game:${gameId}`).emit('game:finished');
  }

  emitGameState(gameId: number, state: unknown) {
    this.server.to(`game:${gameId}`).emit('game:state', state);
  }
}
