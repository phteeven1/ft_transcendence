import { PrismaService } from '../prisma/prisma.service';
import {
  LEADERBOARD_GAME_TYPES,
  matchLeaderboardGameType,
  type LeaderboardGameType,
} from './progression.constants';
import {
  aggregatePlayerTotals,
  computeXpAwarded,
  getMaxUnlockedTier,
  resolveWinnerIds,
  type PlayerProgressionTotals,
} from './progression.helpers';
import {
  emptyByGame,
  finalizeModeStats,
  minDuration,
} from './progression-stats.builders';
import type { PerGameTypeStats } from './progression.types';

export type GameHistoryStats = {
  byGameMap: Map<number, Record<LeaderboardGameType, PerGameTypeStats>>;
  totalsMap: Map<number, PlayerProgressionTotals>;
};

/** Aggregates finished games into per-player / per-mode stats for a group. */
export async function buildGameHistoryStats(
  prisma: PrismaService,
  groupId: number,
): Promise<GameHistoryStats> {
  const finishedGames = await prisma.game.findMany({
    where: {
      inGroupId: groupId,
      isFinished: true,
      progressionAppliedAt: { not: null },
    },
    select: {
      name: true,
      durationMs: true,
      endedAt: true,
      gamePlayers: {
        select: {
          playerId: true,
          score: true,
          bestWordStreak: true,
          wordsFound: true,
          freezeCount: true,
          completed: true,
          leftAt: true,
        },
      },
    },
    orderBy: { endedAt: 'asc' },
  });

  const map = new Map<number, Record<LeaderboardGameType, PerGameTypeStats>>();
  const multiStreaks = new Map<string, { current: number; best: number }>();
  const globalWinStreaks = new Map<number, number>();

  for (const game of finishedGames) {
    const gameType = matchLeaderboardGameType(game.name);
    if (!gameType) continue;

    // Match recordGameOutcome: leavers get no XP / gamesPlayed / win credit.
    const activePlayers = game.gamePlayers.filter((gp) => gp.leftAt == null);
    if (activePlayers.length === 0) continue;

    const participantCount = activePlayers.length;
    const isMultiplayer = participantCount >= 2;
    const winnerIds = resolveWinnerIds(
      activePlayers.map((gp) => ({
        playerId: gp.playerId,
        score: gp.score,
      })),
    );

    for (const gp of activePlayers) {
      const current = map.get(gp.playerId) ?? emptyByGame();
      const bucket = current[gameType];
      const isWinner = winnerIds.has(gp.playerId);
      const gameXp = computeXpAwarded(participantCount, isWinner);

      bucket.gamesPlayed += 1;
      if (isWinner) bucket.wins += 1;
      bucket.bestScore = Math.max(bucket.bestScore, gp.score);
      bucket.bestWordStreak = Math.max(
        bucket.bestWordStreak,
        gp.bestWordStreak,
      );
      bucket.xpEarned += gameXp;

      const mode = isMultiplayer ? bucket.multi : bucket.solo;
      mode.gamesPlayed += 1;
      if (isWinner) mode.wins += 1;
      mode.bestScore = Math.max(mode.bestScore, gp.score);
      mode.bestWordStreak = Math.max(mode.bestWordStreak, gp.bestWordStreak);
      mode.fastestMs = minDuration(mode.fastestMs, game.durationMs);
      mode.xpEarned += gameXp;
      if (gp.completed) mode.gamesCompleted += 1;
      mode.wordsFound += gp.wordsFound;
      mode.freezes += gp.freezeCount;

      if (isMultiplayer) {
        const streakKey = `${gp.playerId}:${gameType}`;
        const streak = multiStreaks.get(streakKey) ?? { current: 0, best: 0 };
        if (isWinner) {
          streak.current += 1;
          streak.best = Math.max(streak.best, streak.current);
          globalWinStreaks.set(
            gp.playerId,
            (globalWinStreaks.get(gp.playerId) ?? 0) + 1,
          );
        } else {
          streak.current = 0;
          globalWinStreaks.set(gp.playerId, 0);
        }
        multiStreaks.set(streakKey, streak);
        mode.bestWinStreak = streak.best;
        bucket.bestWinStreak = Math.max(bucket.bestWinStreak, streak.best);

        bucket.fastestMultiplayerMs = minDuration(
          bucket.fastestMultiplayerMs,
          game.durationMs,
        );
      } else {
        bucket.fastestSoloMs = minDuration(
          bucket.fastestSoloMs,
          game.durationMs,
        );
      }
      map.set(gp.playerId, current);
    }
  }

  for (const byGame of map.values()) {
    for (const gameType of LEADERBOARD_GAME_TYPES) {
      const bucket = byGame[gameType];
      finalizeModeStats(bucket.solo);
      finalizeModeStats(bucket.multi);
      bucket.winRatio = bucket.multi.winRatio;
    }
  }

  const totalsMap = new Map<number, PlayerProgressionTotals>();
  for (const [playerId, byGame] of map.entries()) {
    totalsMap.set(
      playerId,
      aggregatePlayerTotals(byGame, globalWinStreaks.get(playerId) ?? 0),
    );
  }

  return { byGameMap: map, totalsMap };
}

/** Writes derived totals back onto Player rows when they drift from history.
 * XP is included so the Player row stays aligned with sum(computeXpAwarded)
 * over progression-applied games (same formula as recordGameOutcome).
 */
export async function syncPlayersFromGameHistory(
  prisma: PrismaService,
  groupId: number,
  totalsMap: Map<number, PlayerProgressionTotals>,
): Promise<void> {
  const players = await prisma.player.findMany({
    where: { inGroupId: groupId },
    select: {
      id: true,
      xp: true,
      wins: true,
      gamesPlayed: true,
      winStreak: true,
      bestWinStreak: true,
      bestWordStreak: true,
      avatarTier: true,
    },
  });

  const updates: Array<{
    id: number;
    data: {
      xp: number;
      wins: number;
      gamesPlayed: number;
      winStreak: number;
      bestWinStreak: number;
      bestWordStreak: number;
      avatarTier: number;
    };
  }> = [];

  for (const player of players) {
    const totals = totalsMap.get(player.id);
    if (!totals) continue;

    const avatarTier = getMaxUnlockedTier(totals.xp);
    const needsUpdate =
      player.xp !== totals.xp ||
      player.wins !== totals.wins ||
      player.gamesPlayed !== totals.gamesPlayed ||
      player.winStreak !== totals.winStreak ||
      player.bestWinStreak !== totals.bestWinStreak ||
      player.bestWordStreak !== totals.bestWordStreak ||
      player.avatarTier !== avatarTier;

    if (needsUpdate) {
      updates.push({
        id: player.id,
        data: {
          xp: totals.xp,
          wins: totals.wins,
          gamesPlayed: totals.gamesPlayed,
          winStreak: totals.winStreak,
          bestWinStreak: totals.bestWinStreak,
          bestWordStreak: totals.bestWordStreak,
          avatarTier,
        },
      });
    }
  }

  if (updates.length === 0) return;

  await prisma.$transaction(
    updates.map((update) =>
      prisma.player.update({
        where: { id: update.id },
        data: update.data,
      }),
    ),
  );
}
