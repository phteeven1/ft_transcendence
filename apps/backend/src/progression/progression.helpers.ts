import {
  AVATAR_ANIMALS,
  AVATAR_TIERS,
  LEADERBOARD_GAME_TYPES,
  PARTICIPATION_XP,
  WIN_XP,
  type LeaderboardGameType,
} from './progression.constants';
import type { PerGameTypeStats } from './progression.types';

export type GamePlayerScore = {
  playerId: number;
  score: number;
};

/** Solo sessions never award win XP or win streaks. */
export function isMultiplayerGame(participantCount: number): boolean {
  return participantCount >= 2;
}

/**
 * Highest-scoring participants win; ties award all tied leaders.
 */
export function determineWinnerIds(players: GamePlayerScore[]): Set<number> {
  if (players.length === 0) return new Set();
  const maxScore = Math.max(...players.map((p) => p.score));
  return new Set(
    players.filter((p) => p.score === maxScore).map((p) => p.playerId),
  );
}

/** Winners are only resolved for multiplayer games. */
export function resolveWinnerIds(players: GamePlayerScore[]): Set<number> {
  if (!isMultiplayerGame(players.length)) return new Set();
  return determineWinnerIds(players);
}

/** Single source of truth for XP awarded when a game finishes. */
export function computeXpAwarded(
  participantCount: number,
  isWinner: boolean,
): number {
  if (!isMultiplayerGame(participantCount)) return PARTICIPATION_XP;
  return PARTICIPATION_XP + (isWinner ? WIN_XP : 0);
}

export type PlayerProgressionTotals = {
  xp: number;
  wins: number;
  gamesPlayed: number;
  winStreak: number;
  bestWinStreak: number;
  bestWordStreak: number;
};

export function aggregatePlayerTotals(
  byGame: Record<LeaderboardGameType, PerGameTypeStats>,
  winStreak: number,
): PlayerProgressionTotals {
  let xp = 0;
  let wins = 0;
  let gamesPlayed = 0;
  let bestWinStreak = 0;
  let bestWordStreak = 0;

  for (const gameType of LEADERBOARD_GAME_TYPES) {
    const bucket = byGame[gameType];
    xp += bucket.xpEarned;
    wins += bucket.wins;
    gamesPlayed += bucket.gamesPlayed;
    bestWinStreak = Math.max(bestWinStreak, bucket.bestWinStreak);
    bestWordStreak = Math.max(bestWordStreak, bucket.bestWordStreak);
  }

  return {
    xp,
    wins,
    gamesPlayed,
    winStreak,
    bestWinStreak,
    bestWordStreak,
  };
}

export type PlayerProgressionSnapshot = {
  winStreak: number;
  bestWinStreak: number;
};

/** Computes streak fields after a finished game for one participant. */
export function computeStreakUpdate(
  player: PlayerProgressionSnapshot,
  isWinner: boolean,
): { winStreak: number; bestWinStreak: number } {
  if (!isWinner) {
    return { winStreak: 0, bestWinStreak: player.bestWinStreak };
  }
  const winStreak = player.winStreak + 1;
  return {
    winStreak,
    bestWinStreak: Math.max(player.bestWinStreak, winStreak),
  };
}

/** Highest avatar rank unlocked for the given lifetime XP. */
export function getMaxUnlockedTier(xp: number): number {
  let maxTier = 0;
  for (const tier of AVATAR_TIERS) {
    if (xp >= tier.xpRequired) {
      maxTier = tier.tier;
    }
  }
  return maxTier;
}

/** Lists every rank id the player has unlocked. */
export function getUnlockedTierIds(xp: number): number[] {
  return AVATAR_TIERS.filter((tier) => xp >= tier.xpRequired).map(
    (tier) => tier.tier,
  );
}

export function isValidAvatarAnimal(animal: number): boolean {
  return AVATAR_ANIMALS.some((entry) => entry.id === animal);
}
