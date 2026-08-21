'use client';

import { useTranslations } from 'next-intl';
import type {
  LeaderboardGameType,
  PerGameTypeStatsDto,
  PlayerModeStatsDto,
  RecentGameEntryDto,
} from '@/lib/api/progression';
import {
  EMPTY_GAME_STATS,
  EMPTY_MODE_STATS,
  MULTI_BUILDING_STATS,
  MULTI_SOUP_STATS,
  SOLO_BUILDING_STATS,
  SOLO_SOUP_STATS,
  formatEndedAt,
  modeStatLabel,
  modeStatValue,
  type ModeStatKey,
} from './progression-panel-helpers';

export function ProgressionGameStatsCard({
  gameType,
  stats,
}: {
  gameType: LeaderboardGameType;
  stats: PerGameTypeStatsDto;
}) {
  const t = useTranslations('games.lobby.progression');
  const resolved = stats ?? EMPTY_GAME_STATS;

  return (
    <div
      role="tabpanel"
      className="rounded-xl border border-border/60 bg-white/80 px-3 py-3"
    >
      <div className="mb-2 flex items-baseline justify-end">
        <span className="text-xs text-muted-foreground">
          {t('xpValue', { xp: resolved.xpEarned })}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ModeStatsBlock
          label={t('modeLabels.solo')}
          mode={resolved.solo ?? EMPTY_MODE_STATS}
          statKeys={
            gameType === 'Word Soup' ? SOLO_SOUP_STATS : SOLO_BUILDING_STATS
          }
        />
        <ModeStatsBlock
          label={t('modeLabels.multiplayer')}
          mode={resolved.multi ?? EMPTY_MODE_STATS}
          statKeys={
            gameType === 'Word Soup' ? MULTI_SOUP_STATS : MULTI_BUILDING_STATS
          }
        />
      </div>
    </div>
  );
}

export function ProgressionRecentGamesList({
  games,
}: {
  games: RecentGameEntryDto[];
}) {
  const t = useTranslations('games.lobby.progression');

  if (games.length === 0) {
    return (
      <p
        role="tabpanel"
        className="rounded-xl border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground"
      >
        {t('emptyRecent')}
      </p>
    );
  }

  return (
    <ul role="tabpanel" className="space-y-2">
      {games.map((game) => (
        <li
          key={`${game.gameId}-${game.endedAt}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/70 px-3 py-2.5 text-sm"
        >
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {game.gameName}
              {game.isWinner && (
                <span className="ml-1.5" aria-label={t('winner')}>
                  🏆
                </span>
              )}
              {game.abandoned && (
                <span className="ml-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t('abandoned')}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatEndedAt(game.endedAt)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold tabular-nums text-teal-800">
              {t('scoreValue', { score: game.score })}
            </p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {t('xpValue', { xp: game.xpAwarded })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatMiniCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-white/60 px-2 py-1.5">
      <span className="text-[0.65rem] text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}

function ModeStatsBlock({
  label,
  mode,
  statKeys,
}: {
  label: string;
  mode: PlayerModeStatsDto;
  statKeys: ModeStatKey[];
}) {
  const t = useTranslations('games.lobby.progression');

  if (mode.gamesPlayed === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/40 px-2 py-2">
        <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground/70">
          {label}
        </p>
        <p className="text-xs text-muted-foreground/50">{t('noGames')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/40 bg-white/60 px-2 py-2">
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {statKeys.map((key) => (
          <StatMiniCard
            key={key}
            label={modeStatLabel(key, t)}
            value={modeStatValue(key, mode)}
          />
        ))}
      </div>
    </div>
  );
}
