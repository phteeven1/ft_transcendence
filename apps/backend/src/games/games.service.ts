import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { gameWithPlayers, toApiGame } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';
import { PlayersService } from '../players/players.service';
import { GameGateway } from './game.gateway';

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
};

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly playersService: PlayersService,
    @Inject(forwardRef(() => GameGateway))
    private readonly gateway: GameGateway,
  ) {}

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
    const result = toApiGame(game);
    await this.emitLobbyUpdate(inGroup);
    return result;
  }

  async join(gameId: number, playerId: number): Promise<Game | undefined> {
    const game = await this.findById(gameId);
    if (!game || game.isActive) return undefined;

    if (!game.players.includes(playerId)) {
      await this.prisma.gamePlayer.create({
        data: { gameId, playerId },
      });
      await this.playersService.setCurrentGame(playerId, gameId);
    }
    const result = await this.findById(gameId);
    if (result) await this.emitLobbyUpdate(game.inGroup);
    return result;
  }

  async start(gameId: number): Promise<Game | undefined> {
    const game = await this.findById(gameId);
    if (!game) return undefined;
    await this.startGame(game);
    return this.findById(gameId);
  }

  async leave(
    gameId: number,
    playerId: number,
  ): Promise<Game | null | undefined> {
    const game = await this.findById(gameId);
    if (!game) return undefined;

    await this.prisma.gamePlayer.deleteMany({
      where: { gameId, playerId },
    });
    await this.playersService.clearCurrentGame(playerId);

    const updated = await this.findById(gameId);
    if (!updated || updated.players.length === 0) {
      await this.prisma.game.delete({ where: { id: gameId } }).catch(() => {});
      await this.emitLobbyUpdate(game.inGroup);
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
    return this.findById(gameId);
  }

  async abandonPlay(gameId: number, playerId: number): Promise<void> {
    await this.leave(gameId, playerId);
    await this.playersService.clearSession(playerId);
  }

  async findById(gameId: number): Promise<Game | undefined> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      ...gameWithPlayers,
    });
    return game ? toApiGame(game) : undefined;
  }

  async findByGroup(groupId: number): Promise<Game[]> {
    const games = await this.prisma.game.findMany({
      where: { inGroupId: groupId },
      ...gameWithPlayers,
    });
    return games.map(toApiGame);
  }

  async findAll(): Promise<Game[]> {
    const games = await this.prisma.game.findMany(gameWithPlayers);
    return games.map(toApiGame);
  }

  async cleanupExpired(): Promise<void> {
    const now = new Date();
    const THIRTY_MINUTES_MS = 30 * 60 * 1000;

    const pending = await this.prisma.game.findMany({
      where: { isActive: false, isFinished: false },
      ...gameWithPlayers,
    });

    for (const game of pending) {
      const age = now.getTime() - game.initiatedTime.getTime();
      if (age > THIRTY_MINUTES_MS) {
        await this.startGame(toApiGame(game));
      }
    }
  }

  private async startGame(game: Game): Promise<void> {
    await this.prisma.game.update({
      where: { id: game.id },
      data: { isActive: true, startedTime: new Date() },
    });

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

    await this.prisma.game.deleteMany({
      where: {
        isActive: false,
        isFinished: false,
        gamePlayers: { none: {} },
      },
    });

    // Emit after all DB work is done
    const started = await this.findById(game.id);
    if (started) {
      this.gateway.emitGameStarted(game.inGroup, started);
      await this.emitLobbyUpdate(game.inGroup);
    }
  }

  private async emitLobbyUpdate(groupId: number): Promise<void> {
    const games = await this.findByGroup(groupId);
    this.gateway.emitLobbyUpdate(groupId, games);
  }

  async finish(gameId: number): Promise<Game | undefined> {
    const game = await this.findById(gameId);
    if (!game) return undefined;

    await this.prisma.game.update({
      where: { id: gameId },
      data: { isFinished: true, isActive: false },
    });
    for (const pId of game.players) {
      await this.playersService.clearCurrentGame(pId);
    }
    const result = await this.findById(gameId);
    await this.emitLobbyUpdate(game.inGroup);
    // Notify all players inside the game room that the game has ended.
    this.gateway.emitGameFinished(gameId);
    return result;
  }
}