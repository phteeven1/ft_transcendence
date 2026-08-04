import {
  LEADERBOARD_GAME_TYPES,
  type LeaderboardGameType,
} from './progression.constants';
import type { PerGameTypeStats, PlayerModeStats } from './progression.types';

export function emptyModeStats(): PlayerModeStats {
  return {
    gamesPlayed: 0,
    wins: 0,
    bestScore: 0,
    bestWordStreak: 0,
    fastestMs: null,
    xpEarned: 0,
    gamesCompleted: 0,
    wordsFound: 0,
    freezes: 0,
    bestWinStreak: 0,
    winRatio: null,
  };
}

export function emptyPerGameStats(): PerGameTypeStats {
  return {
    gamesPlayed: 0,
    wins: 0,
    bestScore: 0,
    bestWordStreak: 0,
    fastestSoloMs: null,
    fastestMultiplayerMs: null,
    xpEarned: 0,
    bestWinStreak: 0,
    winRatio: null,
    solo: emptyModeStats(),
    multi: emptyModeStats(),
  };
}

export function emptyByGame(): Record<LeaderboardGameType, PerGameTypeStats> {
  return {
    'Word Building': emptyPerGameStats(),
    'Word Soup': emptyPerGameStats(),
  };
}

export function minDuration(
  current: number | null,
  next: number | null | undefined,
): number | null {
  if (next == null || next < 0) return current;
  if (current == null) return next;
  return Math.min(current, next);
}

export function winRatio(wins: number, gamesPlayed: number): number | null {
  if (gamesPlayed <= 0) return null;
  return wins / gamesPlayed;
}

export function finalizeModeStats(mode: PlayerModeStats): void {
  mode.winRatio = winRatio(mode.wins, mode.gamesPlayed);
}

export function multiplayerGamesPlayed(
  byGame: Record<LeaderboardGameType, PerGameTypeStats>,
): number {
  let total = 0;
  for (const gameType of LEADERBOARD_GAME_TYPES) {
    total += byGame[gameType].multi.gamesPlayed;
  }
  return total;
}
