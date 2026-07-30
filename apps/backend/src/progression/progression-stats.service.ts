import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AVATAR_TIERS,
  LEADERBOARD_GAME_TYPES,
  RECENT_GAMES_LIMIT,
} from './progression.constants';
import {
  getUnlockedTierIds,
  isAvatarTierUnlocked,
  isValidAvatarTier,
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
        avatarTier: true,
      },
      orderBy: [{ xp: 'desc' }, { id: 'asc' }],
    });

    const entries: LeaderboardEntry[] = players.map((player, index) => {
      const byGame = byGameMap.get(player.id) ?? emptyByGame();
      const totals = totalsMap.get(player.id);
      return {
        rank: index + 1,
        playerId: player.id,
        playerName: player.name,
        xp: totals?.xp ?? player.xp,
        wins: totals?.wins ?? player.wins,
        winStreak: totals?.winStreak ?? player.winStreak,
        gamesPlayed: multiplayerGamesPlayed(byGame),
        bestWordStreak: totals?.bestWordStreak ?? player.bestWordStreak,
        avatarTier: player.avatarTier,
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
        avatarTier: true,
      },
      orderBy: { name: 'asc' },
    });

    const playerStats: PlayerGroupStats[] = await Promise.all(
      players.map(async (player) => {
        const byGame = byGameMap.get(player.id) ?? emptyByGame();
        const totals = totalsMap.get(player.id);
        return {
          playerId: player.id,
          playerName: player.name,
          xp: totals?.xp ?? player.xp,
          gamesPlayed: totals?.gamesPlayed ?? player.gamesPlayed,
          wins: totals?.wins ?? player.wins,
          winStreak: totals?.winStreak ?? player.winStreak,
          bestWinStreak: totals?.bestWinStreak ?? player.bestWinStreak,
          bestWordStreak: totals?.bestWordStreak ?? player.bestWordStreak,
          avatarTier: player.avatarTier,
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
        xp: true,
        gamesPlayed: true,
        wins: true,
        winStreak: true,
        bestWinStreak: true,
        bestWordStreak: true,
        avatarTier: true,
      },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return toPlayerProgression(player);
  }

  async equipAvatar(
    playerId: number,
    avatarTier: number,
  ): Promise<PlayerProgressionResponse> {
    if (!isValidAvatarTier(avatarTier)) {
      throw new BadRequestException('Invalid avatar tier');
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
      },
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }

    if (!isAvatarTierUnlocked(player.xp, avatarTier)) {
      throw new BadRequestException('Avatar tier is not unlocked');
    }

    const updated = await this.prisma.player.update({
      where: { id: playerId },
      data: { avatarTier },
      select: {
        id: true,
        xp: true,
        gamesPlayed: true,
        wins: true,
        winStreak: true,
        bestWinStreak: true,
        bestWordStreak: true,
        avatarTier: true,
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
            gamePlayers: { select: { playerId: true, score: true } },
          },
        },
      },
      orderBy: { game: { endedAt: 'desc' } },
      take: RECENT_GAMES_LIMIT,
    });

    return participations.map((participation) => {
      const scores = participation.game.gamePlayers.map((gp) => ({
        playerId: gp.playerId,
        score: gp.score,
      }));
      const winnerIds = resolveWinnerIds(scores);

      return {
        gameId: participation.game.id,
        gameName: participation.game.name,
        score: participation.score,
        endedAt: participation.game.endedAt!.toISOString(),
        isWinner: winnerIds.has(playerId),
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
}): PlayerProgressionResponse {
  return {
    playerId: player.id,
    xp: player.xp,
    gamesPlayed: player.gamesPlayed,
    wins: player.wins,
    winStreak: player.winStreak,
    bestWinStreak: player.bestWinStreak,
    bestWordStreak: player.bestWordStreak,
    avatarTier: player.avatarTier,
    unlockedTiers: getUnlockedTierIds(player.xp),
    tiers: AVATAR_TIERS,
  };
}
