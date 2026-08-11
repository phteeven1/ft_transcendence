import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeStreakUpdate,
  computeXpAwarded,
  getMaxUnlockedTier,
  resolveWinnerIds,
} from './progression.helpers';
import type {
  GameFinishOutcome,
  GameFinishPlayerOutcome,
} from './progression.types';

/**
 * Applies and reads per-game finish outcomes (XP, wins, streaks).
 */
@Injectable()
export class ProgressionOutcomeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns finish outcomes for a completed game (scores + XP that was or would be awarded).
   * Unlock celebrations are only available on the live `recordGameOutcome` path.
   */
  async getFinishOutcome(gameId: number): Promise<GameFinishOutcome | null> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        gamePlayers: {
          include: { player: { select: { id: true, name: true } } },
        },
      },
    });
    if (!game?.isFinished) return null;

    // Solo matches should not award win XP / win streaks; they still award
    // participation XP and gamesPlayed++.
    const participantCount = game.gamePlayers.length;
    const winnerIds = resolveWinnerIds(
      game.gamePlayers.map((gp) => ({
        playerId: gp.playerId,
        score: gp.score,
      })),
    );

    return {
      players: game.gamePlayers.map((gp) =>
        toPlayerOutcome(
          gp.playerId,
          gp.player.name,
          gp.score,
          winnerIds,
          participantCount,
          null,
        ),
      ),
    };
  }

  /**
   * Applies participation/win XP and streak updates once per finished game.
   * Idempotent: returns stored outcome when `progressionAppliedAt` is already set.
   */
  async recordGameOutcome(gameId: number): Promise<GameFinishOutcome | null> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        gamePlayers: {
          include: { player: { select: { id: true, name: true } } },
        },
      },
    });
    if (!game?.isFinished) return null;

    if (game.progressionAppliedAt) {
      return this.getFinishOutcome(gameId);
    }

    const participantCount = game.gamePlayers.length;
    const winnerIds = resolveWinnerIds(
      game.gamePlayers.map((gp) => ({
        playerId: gp.playerId,
        score: gp.score,
      })),
    );

    const outcomePlayers: GameFinishPlayerOutcome[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const gp of game.gamePlayers) {
        const player = await tx.player.findUnique({
          where: { id: gp.playerId },
        });
        if (!player) continue;

        const isWinner = winnerIds.has(gp.playerId);
        const streaks = computeStreakUpdate(player, isWinner);
        const xpGain = computeXpAwarded(participantCount, isWinner);
        const newXp = player.xp + xpGain;
        const avatarTier = getMaxUnlockedTier(newXp);
        const previousMax = getMaxUnlockedTier(player.xp);
        const newMax = avatarTier;
        const newlyUnlockedTier = newMax > previousMax ? newMax : null;

        await tx.player.update({
          where: { id: gp.playerId },
          data: {
            xp: { increment: xpGain },
            gamesPlayed: { increment: 1 },
            ...(isWinner ? { wins: { increment: 1 } } : {}),
            winStreak: streaks.winStreak,
            bestWinStreak: streaks.bestWinStreak,
            avatarTier,
          },
        });

        outcomePlayers.push(
          toPlayerOutcome(
            gp.playerId,
            gp.player.name,
            gp.score,
            winnerIds,
            participantCount,
            newlyUnlockedTier,
          ),
        );
      }

      await tx.game.update({
        where: { id: gameId },
        data: { progressionAppliedAt: new Date() },
      });
    });

    return { players: outcomePlayers };
  }
}

function toPlayerOutcome(
  playerId: number,
  playerName: string,
  score: number,
  winnerIds: Set<number>,
  participantCount: number,
  newlyUnlockedTier: number | null,
): GameFinishPlayerOutcome {
  const isWinner = winnerIds.has(playerId);
  return {
    playerId,
    playerName,
    score,
    xpAwarded: computeXpAwarded(participantCount, isWinner),
    isWinner,
    newlyUnlockedTier,
  };
}
