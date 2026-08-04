'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type {
  LeaderboardEntryDto,
  PlayerGroupStatsDto,
} from '@/lib/api/progression';
import { LEADERBOARD_GAME_TYPES } from '@/lib/api/progression';
import { Chip } from '@/app/components/ui/chip';
import { Panel } from '@/app/components/ui/panel';
import { ProgressionLeaderboardTable } from './progression-leaderboard-table';
import {
  ProgressionGameStatsCard,
  ProgressionRecentGamesList,
} from './progression-my-stats';
import {
  EMPTY_GAME_STATS,
  MY_STATS_TABS,
  SCOPE_OPTIONS,
  myStatsTabLabel,
  scopeLabel,
  sortedEntries,
  type LeaderboardScope,
  type MyStatsTabId,
  type TabId,
} from './progression-panel-helpers';
import { ProgressionPlayerSummary } from './progression-player-summary';

type ProgressionPanelProps = {
  localPlayerId: number;
  leaderboard: LeaderboardEntryDto[];
  myStats: PlayerGroupStatsDto | null;
  loading: boolean;
  error: string | null;
};

export default function ProgressionPanel({
  localPlayerId,
  leaderboard,
  myStats,
  loading,
  error,
}: ProgressionPanelProps) {
  const t = useTranslations('games.lobby.progression');
  const [tab, setTab] = useState<TabId>('leaderboard');
  const [scope, setScope] = useState<LeaderboardScope>('overall');
  const [statsTab, setStatsTab] = useState<MyStatsTabId>(
    LEADERBOARD_GAME_TYPES[0],
  );

  const ranked = useMemo(
    () => sortedEntries(leaderboard, scope),
    [leaderboard, scope],
  );

  const localPlayerSummary = useMemo(() => {
    if (myStats) {
      return {
        avatarTier: myStats.avatarTier,
        playerName: myStats.playerName,
        xp: myStats.xp,
      };
    }

    const entry = leaderboard.find((e) => e.playerId === localPlayerId);
    if (!entry) return null;

    return {
      avatarTier: entry.avatarTier,
      playerName: entry.playerName,
      xp: entry.xp,
    };
  }, [myStats, leaderboard, localPlayerId]);

  return (
    <Panel className="p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2" role="tablist" aria-label={t('tabsLabel')}>
          <Chip
            active={tab === 'leaderboard'}
            onClick={() => setTab('leaderboard')}
            aria-selected={tab === 'leaderboard'}
            role="tab"
          >
            {t('leaderboard')}
          </Chip>
          <Chip
            active={tab === 'my-stats'}
            onClick={() => setTab('my-stats')}
            aria-selected={tab === 'my-stats'}
            role="tab"
          >
            {t('myStats')}
          </Chip>
        </div>
        {loading && (
          <span className="text-xs text-muted-foreground">{t('loading')}</span>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {t('loadFailed')}
        </p>
      )}

      {tab === 'leaderboard' ? (
        <div role="tabpanel">
          {localPlayerSummary && (
            <ProgressionPlayerSummary
              avatarTier={localPlayerSummary.avatarTier}
              playerName={localPlayerSummary.playerName}
              xp={localPlayerSummary.xp}
            />
          )}

          <div className="mb-3 flex flex-wrap gap-1.5">
            {SCOPE_OPTIONS.map((option) => (
              <Chip
                key={option}
                active={scope === option}
                onClick={() => setScope(option)}
                className="!px-2.5 !py-1 !text-xs"
              >
                {scopeLabel(option, t)}
              </Chip>
            ))}
          </div>

          {ranked.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              {t('emptyLeaderboard')}
            </p>
          ) : (
            <ProgressionLeaderboardTable
              entries={ranked}
              scope={scope}
              localPlayerId={localPlayerId}
            />
          )}
        </div>
      ) : (
        <div role="tabpanel">
          {!myStats ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              {t('emptyStats')}
            </p>
          ) : (
            <>
              <ProgressionPlayerSummary
                avatarTier={myStats.avatarTier}
                playerName={myStats.playerName}
                xp={myStats.xp}
              />

              <div
                className="mb-4 flex flex-wrap gap-1.5"
                role="tablist"
                aria-label={t('myStatsTabsLabel')}
              >
                {MY_STATS_TABS.map((option) => (
                  <Chip
                    key={option}
                    active={statsTab === option}
                    onClick={() => setStatsTab(option)}
                    aria-selected={statsTab === option}
                    role="tab"
                    className="!px-2.5 !py-1 !text-xs"
                  >
                    {myStatsTabLabel(option, t)}
                  </Chip>
                ))}
              </div>

              {statsTab === 'recent' ? (
                <ProgressionRecentGamesList games={myStats.recentGames} />
              ) : (
                <ProgressionGameStatsCard
                  gameType={statsTab}
                  stats={myStats.byGame[statsTab] ?? EMPTY_GAME_STATS}
                />
              )}
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
