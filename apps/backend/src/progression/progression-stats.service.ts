import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AVATAR_ANIMALS,
  AVATAR_TIERS,
  LEADERBOARD_GAME_TYPES,
  RECENT_GAMES_LIMIT,
} from './progression.constants';
import {
  getMaxUnlockedTier,
  getUnlockedTierIds,
  isValidAvatarAnimal,
  computeXpAwarded,
  resolveWinnerIds,
} from './progression.helpers';
import {
  buildGameHistoryStats,
  syncPlayersFromGameHistory,
} from './progression-history';
import {
  emptyByGame,
  multiplayerGamesPlayed,
} from './progression-stats.builders';
import type {
  GroupStatsResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  PlayerGroupStats,
  PlayerProgressionResponse,
  RecentGameEntry,
} from './progression.types';

/**
 * Reads group/player progression stats and manages avatar equipping.
 */
@Injectable()
export class ProgressionStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertPlayerInGroup(playerId: number, groupId: number): Promise<void> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { inGroupId: true },
    });
    if (!player || player.inGroupId !== groupId) {
      throw new ForbiddenException('Player does not belong to this group');
    }
  }

  async getLeaderboard(groupId: number): Promise<LeaderboardResponse> {
    const { byGameMap, totalsMap } = await buildGameHistoryStats(
      this.prisma,
      groupId,
    );
    await syncPlayersFromGameHistory(this.prisma, groupId, totalsMap);

    const players = await this.prisma.player.findMany({
      where: { inGroupId: groupId },
      select: {
        id: true,
        name: true,
        xp: true,
        wins: true,
        winStreak: true,
        bestWordStreak: true,
        avatarAnimal: true,
      },
      orderBy: [{ xp: 'desc' }, { id: 'asc' }],
    });

    const entries: LeaderboardEntry[] = players.map((player, index) => {
      const byGame = byGameMap.get(player.id) ?? emptyByGame();
      const totals = totalsMap.get(player.id);
      const xp = player.xp;
      return {
        rank: index + 1,
        playerId: player.id,
        playerName: player.name,
        xp,
        wins: totals?.wins ?? player.wins,
        winStreak: totals?.winStreak ?? player.winStreak,
        gamesPlayed: multiplayerGamesPlayed(byGame),
        bestWordStreak: totals?.bestWordStreak ?? player.bestWordStreak,
        avatarTier: getMaxUnlockedTier(xp),
        avatarAnimal: player.avatarAnimal,
        byGame,
      };
    });

    return {
      groupId,
      gameTypes: [...LEADERBOARD_GAME_TYPES],
      entries,
    };
  }

  async getGroupStats(groupId: number): Promise<GroupStatsResponse> {
    const { byGameMap, totalsMap } = await buildGameHistoryStats(
      this.prisma,
      groupId,
    );
    await syncPlayersFromGameHistory(this.prisma, groupId, totalsMap);

    const players = await this.prisma.player.findMany({
      where: { inGroupId: groupId },
      select: {
        id: true,
        name: true,
        xp: true,
        gamesPlayed: true,
        wins: true,
        winStreak: true,
        bestWinStreak: true,
        bestWordStreak: true,
        avatarAnimal: true,
      },
      orderBy: { name: 'asc' },
    });

    const playerStats: PlayerGroupStats[] = await Promise.all(
      players.map(async (player) => {
        const byGame = byGameMap.get(player.id) ?? emptyByGame();
        const totals = totalsMap.get(player.id);
        const xp = player.xp;
        return {
          playerId: player.id,
          playerName: player.name,
          xp,
          gamesPlayed: totals?.gamesPlayed ?? player.gamesPlayed,
          wins: totals?.wins ?? player.wins,
          winStreak: totals?.winStreak ?? player.winStreak,
          bestWinStreak: totals?.bestWinStreak ?? player.bestWinStreak,
          bestWordStreak: totals?.bestWordStreak ?? player.bestWordStreak,
          avatarTier: getMaxUnlockedTier(xp),
          avatarAnimal: player.avatarAnimal,
          byGame,
          recentGames: await this.getRecentGamesForPlayer(groupId, player.id),
        };
      }),
    );

    return {
      groupId,
      gameTypes: [...LEADERBOARD_GAME_TYPES],
      players: playerStats,
    };
  }

  async getMyProgression(playerId: number): Promise<PlayerProgressionResponse> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        inGroupId: true,
        xp: true,
        gamesPlayed: true,
        wins: true,
        winStreak: true,
        bestWinStreak: true,
        bestWordStreak: true,
        avatarTier: true,
        avatarAnimal: true,
      },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Align Player.xp with leaderboard history before returning.
    if (player.inGroupId) {
      const { totalsMap } = await buildGameHistoryStats(
        this.prisma,
        player.inGroupId,
      );
      await syncPlayersFromGameHistory(
        this.prisma,
        player.inGroupId,
        totalsMap,
      );
      const refreshed = await this.prisma.player.findUnique({
        where: { id: playerId },
        select: {
          id: true,
          xp: true,
          gamesPlayed: true,
          wins: true,
          winStreak: true,
          bestWinStreak: true,
          bestWordStreak: true,
          avatarTier: true,
          avatarAnimal: true,
        },
      });
      if (refreshed) {
        return toPlayerProgression(refreshed);
      }
    }

    return toPlayerProgression(player);
  }

  async equipAvatar(
    playerId: number,
    input: { avatarAnimal: number },
  ): Promise<PlayerProgressionResponse> {
    if (!isValidAvatarAnimal(input.avatarAnimal)) {
      throw new BadRequestException('Invalid avatar animal');
    }

    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        xp: true,
        gamesPlayed: true,
        wins: true,
        winStreak: true,
        bestWinStreak: true,
        bestWordStreak: true,
        avatarTier: true,
        avatarAnimal: true,
      },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    const updated = await this.prisma.player.update({
      where: { id: playerId },
      data: { avatarAnimal: input.avatarAnimal },
      select: {
        id: true,
        xp: true,
        gamesPlayed: true,
        wins: true,
        winStreak: true,
        bestWinStreak: true,
        bestWordStreak: true,
        avatarTier: true,
        avatarAnimal: true,
      },
    });

    return toPlayerProgression(updated);
  }

  private async getRecentGamesForPlayer(
    groupId: number,
    playerId: number,
  ): Promise<RecentGameEntry[]> {
    const participations = await this.prisma.gamePlayer.findMany({
      where: {
        playerId,
        game: {
          inGroupId: groupId,
          isFinished: true,
          endedAt: { not: null },
        },
      },
      include: {
        game: {
          select: {
            id: true,
            name: true,
            endedAt: true,
            progressionAppliedAt: true,
            gamePlayers: {
              select: { playerId: true, score: true, leftAt: true },
            },
          },
        },
      },
      orderBy: { game: { endedAt: 'desc' } },
      take: RECENT_GAMES_LIMIT,
    });

    return participations.map((participation) => {
      const activePlayers = participation.game.gamePlayers.filter(
        (gp) => gp.leftAt == null,
      );
      const scores = activePlayers.map((gp) => ({
        playerId: gp.playerId,
        score: gp.score,
      }));
      const participantCount = activePlayers.length;
      const winnerIds = resolveWinnerIds(scores);
      const leftEarly = participation.leftAt != null;
      const abandoned =
        leftEarly || participation.game.progressionAppliedAt == null;
      const isWinner = !abandoned && winnerIds.has(playerId);
      const xpAwarded =
        abandoned || leftEarly
          ? 0
          : computeXpAwarded(participantCount, isWinner);

      return {
        gameId: participation.game.id,
        gameName: participation.game.name,
        score: participation.score,
        endedAt: participation.game.endedAt!.toISOString(),
        isWinner,
        xpAwarded,
        abandoned,
      };
    });
  }
}

function toPlayerProgression(player: {
  id: number;
  xp: number;
  gamesPlayed: number;
  wins: number;
  winStreak: number;
  bestWinStreak: number;
  bestWordStreak: number;
  avatarTier: number;
  avatarAnimal: number;
}): PlayerProgressionResponse {
  return {
    playerId: player.id,
    xp: player.xp,
    gamesPlayed: player.gamesPlayed,
    wins: player.wins,
    winStreak: player.winStreak,
    bestWinStreak: player.bestWinStreak,
    bestWordStreak: player.bestWordStreak,
    avatarTier: getMaxUnlockedTier(player.xp),
    avatarAnimal: player.avatarAnimal,
    unlockedTiers: getUnlockedTierIds(player.xp),
    tiers: AVATAR_TIERS,
    animals: AVATAR_ANIMALS,
  };
}
