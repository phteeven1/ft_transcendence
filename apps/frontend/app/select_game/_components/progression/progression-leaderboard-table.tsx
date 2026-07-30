'use client';

import { useTranslations } from 'next-intl';
import type { LeaderboardEntryDto } from '@/lib/api/progression';
import { formatDurationMs } from '@/lib/format-duration';
import { AvatarTierFlair } from './avatar-tier-flair';
import { AvatarTierThumb } from './avatar-tier-thumb';
import {
  EMPTY_GAME_STATS,
  formatWinRatio,
  type LeaderboardScope,
} from './progression-panel-helpers';

type ProgressionLeaderboardTableProps = {
  entries: LeaderboardEntryDto[];
  scope: LeaderboardScope;
  localPlayerId: number;
};

export function ProgressionLeaderboardTable({
  entries,
  scope,
  localPlayerId,
}: ProgressionLeaderboardTableProps) {
  const t = useTranslations('games.lobby.progression');
  const isOverall = scope === 'overall';
  const isWordSoup = scope === 'Word Soup';

  const columns = isOverall
    ? (['rank', 'player', 'xp', 'played', 'wins', 'winStreak'] as const)
    : isWordSoup
      ? ([
          'rank',
          'player',
          'xp',
          'bestScore',
          'played',
          'wins',
          'winStreak',
          'winRatio',
          'wordStreak',
          'soloBest',
          'multiBest',
        ] as const)
      : ([
          'rank',
          'player',
          'xp',
          'bestScore',
          'played',
          'wins',
          'winStreak',
          'soloBest',
          'multiBest',
        ] as const);

  const columnLabel = (col: (typeof columns)[number]) => {
    switch (col) {
      case 'rank':
        return '#';
      case 'player':
        return t('player');
      case 'xp':
        return t('columns.xp');
      case 'played':
        return t('columns.played');
      case 'wins':
        return t('columns.wins');
      case 'winStreak':
        return t('columns.winStreak');
      case 'winRatio':
        return t('columns.winRatio');
      case 'wordStreak':
        return t('columns.wordStreak');
      case 'bestScore':
        return t('columns.bestScore');
      case 'soloBest':
        return t('columns.soloBest');
      case 'multiBest':
        return t('columns.multiBest');
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-separate border-spacing-y-1.5 text-left text-sm">
        <thead>
          <tr className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-teal-800/80">
            {columns.map((col) => (
              <th
                key={col}
                className={[
                  'px-2 py-1 font-semibold',
                  col === 'rank' ? 'w-8 text-center' : '',
                  col === 'player' ? 'min-w-[8rem]' : '',
                  col !== 'rank' && col !== 'player'
                    ? 'text-right tabular-nums'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {columnLabel(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => {
            const isYou = entry.playerId === localPlayerId;
            const gameStats =
              scope !== 'overall'
                ? (entry.byGame?.[scope] ?? EMPTY_GAME_STATS)
                : null;
            const rowClass = isYou
              ? '[&>td]:border-teal-400 [&>td]:bg-teal-50/80'
              : '[&>td]:border-border/60 [&>td]:bg-white/70';

            const cellValue = (col: (typeof columns)[number]) => {
              switch (col) {
                case 'rank':
                  return (
                    <span className="font-heading font-bold text-teal-800">
                      {idx + 1}
                    </span>
                  );
                case 'player':
                  return (
                    <div className="flex min-w-0 items-center gap-2">
                      <AvatarTierThumb
                        tier={entry.avatarTier}
                        className="!h-8 !w-8"
                      />
                      <div className="min-w-0">
                        <span className="block truncate font-semibold text-foreground">
                          {entry.playerName}
                          {isYou && (
                            <span className="ml-1 text-xs font-medium text-teal-700">
                              {t('you')}
                            </span>
                          )}
                        </span>
                        <AvatarTierFlair
                          tier={entry.avatarTier}
                          size="sm"
                          className="mt-0.5"
                        />
                      </div>
                    </div>
                  );
                case 'xp':
                  return (
                    <span className="font-semibold tabular-nums text-teal-800">
                      {isOverall ? entry.xp : (gameStats?.xpEarned ?? 0)}
                    </span>
                  );
                case 'played':
                  return (
                    <span className="tabular-nums">
                      {isOverall
                        ? entry.gamesPlayed
                        : (gameStats?.multi?.gamesPlayed ?? 0)}
                    </span>
                  );
                case 'wins':
                  return (
                    <span className="tabular-nums">
                      {isOverall ? entry.wins : (gameStats?.wins ?? 0)}
                    </span>
                  );
                case 'winStreak':
                  return (
                    <span className="tabular-nums">
                      {isOverall
                        ? entry.winStreak
                        : (gameStats?.bestWinStreak ?? 0)}
                    </span>
                  );
                case 'winRatio':
                  return (
                    <span className="tabular-nums">
                      {formatWinRatio(gameStats?.winRatio ?? null)}
                    </span>
                  );
                case 'wordStreak':
                  return (
                    <span className="tabular-nums">
                      {gameStats?.bestWordStreak ?? 0}
                    </span>
                  );
                case 'bestScore':
                  return (
                    <span className="font-semibold tabular-nums text-teal-800">
                      {gameStats?.bestScore ?? 0}
                    </span>
                  );
                case 'soloBest':
                  return (
                    <span className="tabular-nums text-muted-foreground">
                      {formatDurationMs(gameStats?.fastestSoloMs ?? null)}
                    </span>
                  );
                case 'multiBest':
                  return (
                    <span className="tabular-nums text-muted-foreground">
                      {formatDurationMs(
                        gameStats?.fastestMultiplayerMs ?? null,
                      )}
                    </span>
                  );
              }
            };

            return (
              <tr key={entry.playerId} className={rowClass}>
                {columns.map((col, colIdx) => (
                  <td
                    key={col}
                    className={[
                      'border px-2 py-2 align-middle',
                      col === 'rank' ? 'text-center' : '',
                      col !== 'rank' && col !== 'player' ? 'text-right' : '',
                      colIdx === 0 ? 'rounded-l-xl border-r-0' : '',
                      colIdx === columns.length - 1
                        ? 'rounded-r-xl border-l-0'
                        : colIdx > 0
                          ? 'border-x-0'
                          : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {cellValue(col)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
