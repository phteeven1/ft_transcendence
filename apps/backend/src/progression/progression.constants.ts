/** XP awarded to every player when a game finishes normally. */
export const PARTICIPATION_XP = 10;

/** Additional XP for player(s) with the highest score (ties share the win). */
export const WIN_XP = 25;

/** Number of recent finished games included in group stats per player. */
export const RECENT_GAMES_LIMIT = 5;

export type AvatarTierDefinition = {
  tier: number;
  label: string;
  variantKey: string;
  xpRequired: number;
};

export const AVATAR_TIERS: AvatarTierDefinition[] = [
  { tier: 0, label: 'Apprentice', variantKey: 'tier-0', xpRequired: 0 },
  { tier: 1, label: 'Explorer', variantKey: 'tier-1', xpRequired: 50 },
  { tier: 2, label: 'Wordsmith', variantKey: 'tier-2', xpRequired: 150 },
  { tier: 3, label: 'Champion', variantKey: 'tier-3', xpRequired: 300 },
  { tier: 4, label: 'Legend', variantKey: 'tier-4', xpRequired: 500 },
];

/** Canonical game display names used when creating games from the lobby. */
export const GAME_TYPE_WORD_SOUP = 'Word Soup';
export const GAME_TYPE_WORD_BUILDING = 'Word Building';

export const LEADERBOARD_GAME_TYPES = [
  GAME_TYPE_WORD_BUILDING,
  GAME_TYPE_WORD_SOUP,
] as const;

export type LeaderboardGameType = (typeof LEADERBOARD_GAME_TYPES)[number];

export function normalizeGameTypeName(name: string): string {
  return name.trim().toLowerCase();
}

export function matchLeaderboardGameType(
  gameName: string,
): LeaderboardGameType | null {
  const normalized = normalizeGameTypeName(gameName);
  for (const type of LEADERBOARD_GAME_TYPES) {
    if (normalizeGameTypeName(type) === normalized) return type;
  }
  return null;
}
