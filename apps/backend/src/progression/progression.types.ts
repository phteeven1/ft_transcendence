import type { AvatarTierDefinition } from './progression.constants';
import type { LeaderboardGameType } from './progression.constants';

export type GameFinishPlayerOutcome = {
  playerId: number;
  playerName: string;
  score: number;
  xpAwarded: number;
  isWinner: boolean;
  /** Highest tier newly unlocked by this finish's XP; null if none. */
  newlyUnlockedTier: number | null;
};

export type GameFinishOutcome = {
  players: GameFinishPlayerOutcome[];
};

export type PlayerModeStats = {
  gamesPlayed: number;
  wins: number;
  bestScore: number;
  bestWordStreak: number;
  fastestMs: number | null;
  xpEarned: number;
  gamesCompleted: number;
  wordsFound: number;
  freezes: number;
  bestWinStreak: number;
  winRatio: number | null;
};

export type PerGameTypeStats = {
  gamesPlayed: number;
  wins: number;
  bestScore: number;
  bestWordStreak: number;
  fastestSoloMs: number | null;
  fastestMultiplayerMs: number | null;
  xpEarned: number;
  bestWinStreak: number;
  winRatio: number | null;
  solo: PlayerModeStats;
  multi: PlayerModeStats;
};

export type LeaderboardEntry = {
  rank: number;
  playerId: number;
  playerName: string;
  xp: number;
  wins: number;
  winStreak: number;
  gamesPlayed: number;
  bestWordStreak: number;
  avatarTier: number;
  byGame: Record<LeaderboardGameType, PerGameTypeStats>;
};

export type LeaderboardResponse = {
  groupId: number;
  gameTypes: LeaderboardGameType[];
  entries: LeaderboardEntry[];
};

export type RecentGameEntry = {
  gameId: number;
  gameName: string;
  score: number;
  endedAt: string;
  isWinner: boolean;
};

export type PlayerGroupStats = {
  playerId: number;
  playerName: string;
  xp: number;
  gamesPlayed: number;
  wins: number;
  winStreak: number;
  bestWinStreak: number;
  bestWordStreak: number;
  avatarTier: number;
  byGame: Record<LeaderboardGameType, PerGameTypeStats>;
  recentGames: RecentGameEntry[];
};

export type GroupStatsResponse = {
  groupId: number;
  gameTypes: LeaderboardGameType[];
  players: PlayerGroupStats[];
};

export type PlayerProgressionResponse = {
  playerId: number;
  xp: number;
  gamesPlayed: number;
  wins: number;
  winStreak: number;
  bestWinStreak: number;
  bestWordStreak: number;
  avatarTier: number;
  unlockedTiers: number[];
  tiers: AvatarTierDefinition[];
};
