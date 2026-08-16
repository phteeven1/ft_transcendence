import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { toSafePlayer, playerWithSession } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';

export type Player = {
  id: number;
  inGroup: number;
  ofUser: number;
  name: string;
  currentGameId: number | null;
  sessionExpiresAt: string | null;
};

export type PlayerSessionDto = {
  token: string;
  playerId: number;
  expiresAt: string;
  createdAt: string;
};

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class PlayersService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.cleanupExpiredSessions();
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpiredSessions();
    }, CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async create(inGroup: number, ofUser: number, name: string): Promise<Player> {
    const player = await this.prisma.player.create({
      data: {
        inGroupId: inGroup,
        ofUserId: ofUser,
        name,
      },
      ...playerWithSession,
    });
    return toSafePlayer(player);
  }

  async rename(playerId: number, name: string): Promise<Player | undefined> {
    try {
      const player = await this.prisma.player.update({
        where: { id: playerId },
        data: { name },
        ...playerWithSession,
      });
      return toSafePlayer(player);
    } catch {
      return undefined;
    }
  }

  async remove(playerId: number): Promise<boolean> {
    try {
      const player = await this.prisma.player.findUnique({
        where: { id: playerId },
        select: { id: true },
      });
      if (!player) return false;

      await this.prisma.$transaction(async (tx) => {
        await tx.playerSession.deleteMany({ where: { playerId } });

        const participations = await tx.gamePlayer.findMany({
          where: { playerId },
          select: {
            gameId: true,
            game: { select: { initiatedById: true } },
          },
        });

        for (const { gameId, game } of participations) {
          const otherPlayers = await tx.gamePlayer.findMany({
            where: { gameId, playerId: { not: playerId } },
            select: { playerId: true },
            orderBy: { playerId: 'asc' },
          });

          if (otherPlayers.length === 0) {
            await tx.game.delete({ where: { id: gameId } });
            continue;
          }

          if (game.initiatedById === playerId) {
            await tx.game.update({
              where: { id: gameId },
              data: { initiatedById: otherPlayers[0].playerId },
            });
          }

          await tx.gamePlayer.delete({
            where: { gameId_playerId: { gameId, playerId } },
          });
        }

        const orphanedInitiated = await tx.game.findMany({
          where: { initiatedById: playerId },
          select: { id: true },
        });
        for (const { id: gameId } of orphanedInitiated) {
          await tx.game.delete({ where: { id: gameId } });
        }

        await tx.player.update({
          where: { id: playerId },
          data: { currentGameId: null },
        });

        await tx.player.delete({ where: { id: playerId } });
      });

      return true;
    } catch (error) {
      console.error('Failed to remove player', error);
      return false;
    }
  }

  async findById(playerId: number): Promise<Player | undefined> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      ...playerWithSession,
    });
    return player ? toSafePlayer(player) : undefined;
  }

  async findByGroup(inGroup: number): Promise<Player[]> {
    const players = await this.prisma.player.findMany({
      where: { inGroupId: inGroup },
      ...playerWithSession,
    });
    return players.map((p) => toSafePlayer(p));
  }

  async setCurrentGame(playerId: number, gameId: number): Promise<void> {
    await this.prisma.player.update({
      where: { id: playerId },
      data: { currentGameId: gameId },
    });
  }

  async clearCurrentGame(playerId: number): Promise<void> {
    await this.prisma.player.update({
      where: { id: playerId },
      data: { currentGameId: null },
    });
  }

  async getActiveSession(playerId: number): Promise<PlayerSessionDto | null> {
    await this.cleanupExpiredSessions();
    const session = await this.prisma.playerSession.findUnique({
      where: { playerId },
    });
    if (!session || session.expiresAt <= new Date()) return null;
    return this.toSessionDto(session);
  }

  async startSession(
    playerId: number,
    minutes: number,
  ): Promise<PlayerSessionDto> {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      throw new ConflictException(
        'Session length must be a positive number of minutes',
      );
    }

    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    await this.cleanupExpiredSessions();

    const existing = await this.prisma.playerSession.findUnique({
      where: { playerId },
    });
    if (existing && existing.expiresAt > new Date()) {
      throw new ConflictException('Player already has an active session');
    }

    if (existing) {
      await this.prisma.playerSession.delete({ where: { playerId } });
    }

    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    const session = await this.prisma.playerSession.create({
      data: { playerId, expiresAt },
    });

    return this.toSessionDto(session);
  }

  async validateSession(
    playerId: number,
    token: string,
  ): Promise<{ valid: true; expiresAt: string }> {
    await this.cleanupExpiredSessions();

    const session = await this.prisma.playerSession.findUnique({
      where: { playerId },
    });

    if (!session || session.token !== token) {
      throw new UnauthorizedException('Invalid session token');
    }

    if (session.expiresAt <= new Date()) {
      await this.prisma.playerSession.delete({ where: { playerId } });
      throw new UnauthorizedException('Session has expired');
    }

    return { valid: true, expiresAt: session.expiresAt.toISOString() };
  }

  async clearSession(playerId: number): Promise<void> {
    await this.prisma.playerSession.deleteMany({ where: { playerId } });
    await this.clearCurrentGame(playerId);
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.prisma.playerSession.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    return result.count;
  }

  private toSessionDto(session: {
    token: string;
    playerId: number;
    expiresAt: Date;
    createdAt: Date;
  }): PlayerSessionDto {
    return {
      token: session.token,
      playerId: session.playerId,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }
}
