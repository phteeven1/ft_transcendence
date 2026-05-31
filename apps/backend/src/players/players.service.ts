import { Injectable } from '@nestjs/common';
import { toSafePlayer } from '../common/mappers';
import { PrismaService } from '../prisma/prisma.service';

export type Player = {
  id: number;
  inGroup: number;
  ofUser: number;
  name: string;
  passQuestion: string;
  passAnswer: string;
  currentGameId: number | null;
};

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    inGroup: number,
    ofUser: number,
    name: string,
    passQuestion: string,
    passAnswer: string,
  ): Promise<Omit<Player, 'passAnswer'>> {
    const player = await this.prisma.player.create({
      data: {
        inGroupId: inGroup,
        ofUserId: ofUser,
        name,
        passQuestion,
        passAnswer,
      },
    });
    return toSafePlayer(player);
  }

  async rename(
    playerId: number,
    name: string,
  ): Promise<Omit<Player, 'passAnswer'> | undefined> {
    try {
      const player = await this.prisma.player.update({
        where: { id: playerId },
        data: { name },
      });
      return toSafePlayer(player);
    } catch {
      return undefined;
    }
  }

  async updatePassPhrase(
    playerId: number,
    passQuestion: string,
    passAnswer: string,
  ): Promise<Omit<Player, 'passAnswer'> | undefined> {
    try {
      const player = await this.prisma.player.update({
        where: { id: playerId },
        data: { passQuestion, passAnswer },
      });
      return toSafePlayer(player);
    } catch {
      return undefined;
    }
  }

  async remove(playerId: number): Promise<boolean> {
    try {
      await this.prisma.player.delete({ where: { id: playerId } });
      return true;
    } catch {
      return false;
    }
  }

  async removeByGroup(inGroup: number): Promise<void> {
    await this.prisma.player.deleteMany({ where: { inGroupId: inGroup } });
  }

  async findById(
    playerId: number,
  ): Promise<Omit<Player, 'passAnswer'> | undefined> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });
    return player ? toSafePlayer(player) : undefined;
  }

  async findByParentInGroup(
    ofUser: number,
    inGroup: number,
  ): Promise<Omit<Player, 'passAnswer'>[]> {
    const players = await this.prisma.player.findMany({
      where: { ofUserId: ofUser, inGroupId: inGroup },
    });
    return players.map((p) => toSafePlayer(p));
  }

  async findByGroup(inGroup: number): Promise<Omit<Player, 'passAnswer'>[]> {
    const players = await this.prisma.player.findMany({
      where: { inGroupId: inGroup },
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

}
