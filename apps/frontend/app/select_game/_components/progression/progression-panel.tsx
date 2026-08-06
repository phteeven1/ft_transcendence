'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type {
  LeaderboardEntryDto,
  PlayerGroupStatsDto,
  PlayerProgressionResponseDto,
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
import { AvatarEquipPicker } from './avatar-equip-picker';

type ProgressionPanelProps = {
  localPlayerId: number;
  leaderboard: LeaderboardEntryDto[];
  myStats: PlayerGroupStatsDto | null;
  myProgression: PlayerProgressionResponseDto | null;
  loading: boolean;
  error: string | null;
  equipping: boolean;
  equipError: string | null;
  onEquipAvatar: (tier: number) => void;
};

export default function ProgressionPanel({
  localPlayerId,
  leaderboard,
  myStats,
  myProgression,
  loading,
  error,
  equipping,
  equipError,
  onEquipAvatar,
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

  const displayTier =
    myProgression?.avatarTier ??
    myStats?.avatarTier ??
    leaderboard.find((e) => e.playerId === localPlayerId)?.avatarTier ??
    0;

  const localPlayerSummary = useMemo(() => {
    if (myStats) {
      return {
        avatarTier: displayTier,
        playerName: myStats.playerName,
        xp: myProgression?.xp ?? myStats.xp,
      };
    }

    const entry = leaderboard.find((e) => e.playerId === localPlayerId);
    if (!entry) return null;

    return {
      avatarTier: displayTier,
      playerName: entry.playerName,
      xp: myProgression?.xp ?? entry.xp,
    };
  }, [myStats, leaderboard, localPlayerId, displayTier, myProgression?.xp]);

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
          {!myStats && !myProgression ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              {t('emptyStats')}
            </p>
          ) : (
            <>
              {localPlayerSummary && (
                <ProgressionPlayerSummary
                  avatarTier={localPlayerSummary.avatarTier}
                  playerName={localPlayerSummary.playerName}
                  xp={localPlayerSummary.xp}
                />
              )}

              {myProgression && (
                <AvatarEquipPicker
                  progression={myProgression}
                  equipping={equipping}
                  equipError={equipError}
                  onEquip={onEquipAvatar}
                />
              )}

              {myStats && (
                <>
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
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
