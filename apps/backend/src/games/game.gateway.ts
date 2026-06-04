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
    @MessageBody() data: { gameId: number },
  ) {
    client.join(`game:${data.gameId}`);
  }

  handleDisconnect(client: Socket) {
    // client.data.playerId and client.data.groupId are available here
    // disconnect handling (leave pending games) goes here later
  }

  emitLobbyUpdate(groupId: number, games: Game[]) {
    this.server.to(`group:${groupId}`).emit('lobby:update', { games });
  }

  emitGameStarted(groupId: number, game: Game) {
    this.server.to(`group:${groupId}`).emit('game:started', { game });
  }

  emitGameState(gameId: number, state: unknown) {
    this.server.to(`game:${gameId}`).emit('game:state', state);
  }
}