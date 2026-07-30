export type AvatarTierDefinitionDto = {
  tier: number;
  label: string;
  variantKey: string;
  xpRequired: number;
};

export type LeaderboardGameType = 'Word Soup' | 'Word Building';

export type PlayerModeStatsDto = {
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

export type PerGameTypeStatsDto = {
  gamesPlayed: number;
  wins: number;
  bestScore: number;
  bestWordStreak: number;
  fastestSoloMs: number | null;
  fastestMultiplayerMs: number | null;
  xpEarned: number;
  bestWinStreak: number;
  winRatio: number | null;
  solo: PlayerModeStatsDto;
  multi: PlayerModeStatsDto;
};

export type LeaderboardEntryDto = {
  rank: number;
  playerId: number;
  playerName: string;
  xp: number;
  wins: number;
  winStreak: number;
  gamesPlayed: number;
  bestWordStreak: number;
  avatarTier: number;
  byGame: Record<LeaderboardGameType, PerGameTypeStatsDto>;
};

export type LeaderboardResponseDto = {
  groupId: number;
  gameTypes: LeaderboardGameType[];
  entries: LeaderboardEntryDto[];
};

export type RecentGameEntryDto = {
  gameId: number;
  gameName: string;
  score: number;
  endedAt: string;
  isWinner: boolean;
};

export type PlayerGroupStatsDto = {
  playerId: number;
  playerName: string;
  xp: number;
  gamesPlayed: number;
  wins: number;
  winStreak: number;
  bestWinStreak: number;
  bestWordStreak: number;
  avatarTier: number;
  byGame: Record<LeaderboardGameType, PerGameTypeStatsDto>;
  recentGames: RecentGameEntryDto[];
};

export type GroupStatsResponseDto = {
  groupId: number;
  gameTypes: LeaderboardGameType[];
  players: PlayerGroupStatsDto[];
};

export type PlayerProgressionResponseDto = {
  playerId: number;
  xp: number;
  gamesPlayed: number;
  wins: number;
  winStreak: number;
  bestWinStreak: number;
  bestWordStreak: number;
  avatarTier: number;
  unlockedTiers: number[];
  tiers: AvatarTierDefinitionDto[];
};

export type EquipAvatarInput = {
  avatarTier: number;
};

/** Mirrors backend constants for offline UI (e.g. tier previews). */
export const AVATAR_TIERS: AvatarTierDefinitionDto[] = [
  { tier: 0, label: 'Apprentice', variantKey: 'tier-0', xpRequired: 0 },
  { tier: 1, label: 'Explorer', variantKey: 'tier-1', xpRequired: 50 },
  { tier: 2, label: 'Wordsmith', variantKey: 'tier-2', xpRequired: 150 },
  { tier: 3, label: 'Champion', variantKey: 'tier-3', xpRequired: 300 },
  { tier: 4, label: 'Legend', variantKey: 'tier-4', xpRequired: 500 },
];

export const LEADERBOARD_GAME_TYPES: LeaderboardGameType[] = [
  'Word Building',
  'Word Soup',
];
