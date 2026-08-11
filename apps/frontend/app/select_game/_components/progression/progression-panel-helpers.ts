import type { useTranslations } from 'next-intl';
import type {
  LeaderboardEntryDto,
  LeaderboardGameType,
  PerGameTypeStatsDto,
  PlayerModeStatsDto,
} from '@/lib/api/progression';
import { LEADERBOARD_GAME_TYPES } from '@/lib/api/progression';
import { formatDurationMs } from '@/lib/format-duration';

export type TranslateFn = ReturnType<typeof useTranslations>;

export type LeaderboardScope = 'overall' | LeaderboardGameType;

export type TabId = 'leaderboard' | 'my-stats' | 'avatar';

export type MyStatsTabId = LeaderboardGameType | 'recent';

export type ModeStatKey =
  | 'xp'
  | 'played'
  | 'completed'
  | 'fastest'
  | 'wordsFound'
  | 'wordStreak'
  | 'freezes'
  | 'wins'
  | 'winStreak'
  | 'winRatio';

export const MY_STATS_TABS: MyStatsTabId[] = [
  ...LEADERBOARD_GAME_TYPES,
  'recent',
];

export const SCOPE_OPTIONS: LeaderboardScope[] = [
  'overall',
  ...LEADERBOARD_GAME_TYPES,
];

export const EMPTY_MODE_STATS: PlayerModeStatsDto = {
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

export const EMPTY_GAME_STATS: PerGameTypeStatsDto = {
  gamesPlayed: 0,
  wins: 0,
  bestScore: 0,
  bestWordStreak: 0,
  fastestSoloMs: null,
  fastestMultiplayerMs: null,
  xpEarned: 0,
  bestWinStreak: 0,
  winRatio: null,
  solo: { ...EMPTY_MODE_STATS },
  multi: { ...EMPTY_MODE_STATS },
};

export const SOLO_SOUP_STATS: ModeStatKey[] = [
  'xp',
  'played',
  'completed',
  'fastest',
  'wordsFound',
  'wordStreak',
  'freezes',
];
export const MULTI_SOUP_STATS: ModeStatKey[] = [
  'xp',
  'played',
  'completed',
  'fastest',
  'wordsFound',
  'wordStreak',
  'freezes',
  'wins',
  'winStreak',
  'winRatio',
];
export const SOLO_BUILDING_STATS: ModeStatKey[] = [
  'xp',
  'played',
  'completed',
  'fastest',
];
export const MULTI_BUILDING_STATS: ModeStatKey[] = [
  'xp',
  'played',
  'completed',
  'fastest',
  'wins',
  'winStreak',
  'winRatio',
];

export function gameTypeLabel(
  gameType: LeaderboardGameType,
  t: TranslateFn,
): string {
  return gameType === 'Word Soup'
    ? t('gameTypes.wordSoup')
    : t('gameTypes.wordBuilding');
}

export function myStatsTabLabel(tab: MyStatsTabId, t: TranslateFn): string {
  if (tab === 'recent') return t('recentGames');
  return gameTypeLabel(tab, t);
}

export function scopeLabel(scope: LeaderboardScope, t: TranslateFn): string {
  if (scope === 'overall') return t('scope.overall');
  return gameTypeLabel(scope, t);
}

export function formatEndedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatWinRatio(ratio: number | null): string {
  if (ratio == null) return '—';
  return `${Math.round(ratio * 100)}%`;
}

export function modeStatLabel(key: ModeStatKey, t: TranslateFn): string {
  switch (key) {
    case 'xp':
      return t('columns.xp');
    case 'played':
      return t('columns.played');
    case 'completed':
      return t('columns.completed');
    case 'fastest':
      return t('columns.fastest');
    case 'wordsFound':
      return t('columns.wordsFound');
    case 'wordStreak':
      return t('columns.wordStreak');
    case 'freezes':
      return t('columns.freezes');
    case 'wins':
      return t('columns.wins');
    case 'winStreak':
      return t('columns.winStreak');
    case 'winRatio':
      return t('columns.winRatio');
  }
}

export function modeStatValue(
  key: ModeStatKey,
  mode: PlayerModeStatsDto,
): string {
  switch (key) {
    case 'xp':
      return String(mode.xpEarned);
    case 'played':
      return String(mode.gamesPlayed);
    case 'completed':
      return String(mode.gamesCompleted);
    case 'fastest':
      return formatDurationMs(mode.fastestMs);
    case 'wordsFound':
      return String(mode.wordsFound);
    case 'wordStreak':
      return String(mode.bestWordStreak);
    case 'freezes':
      return String(mode.freezes);
    case 'wins':
      return String(mode.wins);
    case 'winStreak':
      return String(mode.bestWinStreak);
    case 'winRatio':
      return formatWinRatio(mode.winRatio);
  }
}

export function sortedEntries(
  entries: LeaderboardEntryDto[],
  scope: LeaderboardScope,
): LeaderboardEntryDto[] {
  if (scope === 'overall') {
    return [...entries].sort((a, b) => b.xp - a.xp);
  }
  return [...entries]
    .filter((e) => (e.byGame?.[scope]?.gamesPlayed ?? 0) > 0)
    .sort(
      (a, b) =>
        (b.byGame?.[scope]?.xpEarned ?? 0) - (a.byGame?.[scope]?.xpEarned ?? 0),
    );
}
