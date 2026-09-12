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
   * Unrewarded / abandoned finishes and players who left early always show 0 XP.
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

    const activePlayers = game.gamePlayers.filter((gp) => gp.leftAt == null);
    const participantCount = activePlayers.length;
    const winnerIds = resolveWinnerIds(
      activePlayers.map((gp) => ({
        playerId: gp.playerId,
        score: gp.score,
      })),
    );
    const rewarded = game.progressionAppliedAt != null;

    return {
      players: game.gamePlayers.map((gp) => {
        const leftEarly = gp.leftAt != null;
        const awardXp = rewarded && !leftEarly;
        return toPlayerOutcome(
          gp.playerId,
          gp.player.name,
          gp.score,
          winnerIds,
          participantCount,
          null,
          awardXp,
          leftEarly,
        );
      }),
    };
  }

  /**
   * Applies participation/win XP and streak updates once per finished game.
   * Idempotent: returns stored outcome when `progressionAppliedAt` is already set.
   * Players who left early (`leftAt`) receive no XP and no gamesPlayed bump.
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

    const activePlayers = game.gamePlayers.filter((gp) => gp.leftAt == null);
    const participantCount = activePlayers.length;
    const winnerIds = resolveWinnerIds(
      activePlayers.map((gp) => ({
        playerId: gp.playerId,
        score: gp.score,
      })),
    );

    const outcomePlayers: GameFinishPlayerOutcome[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const gp of game.gamePlayers) {
        const leftEarly = gp.leftAt != null;
        if (leftEarly) {
          outcomePlayers.push(
            toPlayerOutcome(
              gp.playerId,
              gp.player.name,
              gp.score,
              winnerIds,
              participantCount,
              null,
              false,
              true,
            ),
          );
          continue;
        }

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
            true,
            false,
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

  /**
   * Returns score standings for a finished game without XP (early termination).
   */
  async getUnrewardedFinishOutcome(
    gameId: number,
  ): Promise<GameFinishOutcome | null> {
    const outcome = await this.getFinishOutcome(gameId);
    if (!outcome) return null;
    return {
      players: outcome.players.map((player) => ({
        ...player,
        xpAwarded: 0,
      })),
    };
  }
}

function toPlayerOutcome(
  playerId: number,
  playerName: string,
  score: number,
  winnerIds: Set<number>,
  participantCount: number,
  newlyUnlockedTier: number | null,
  awardXp: boolean,
  leftEarly: boolean,
): GameFinishPlayerOutcome {
  const isWinner = winnerIds.has(playerId);
  return {
    playerId,
    playerName,
    score,
    xpAwarded: awardXp ? computeXpAwarded(participantCount, isWinner) : 0,
    isWinner,
    newlyUnlockedTier,
    leftEarly,
  };
}
