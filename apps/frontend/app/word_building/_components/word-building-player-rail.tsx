'use client';

import { useTranslations } from 'next-intl';
import HostCharacter from '@/app/components/game/host-character';
import { Icon } from '@/app/components/ui';

type ScoreEntry = { playerId: number; score: number };

type WordBuildingPlayerRailProps = {
  playerNames: Map<number, string>;
  scores: ScoreEntry[];
  localPlayerId: number;
  playerColours: Record<number, string>;
  playerAvatarTiers: Record<number, number>;
  playerAvatarAnimals: Record<number, number>;
  leftPlayers: Record<number, string>;
  orientation?: 'vertical' | 'horizontal';
};

/** Scoreboard rail showing player avatars, names, and scores for Word Building. */
export default function WordBuildingPlayerRail({
  playerNames,
  scores,
  localPlayerId,
  playerColours,
  playerAvatarTiers,
  playerAvatarAnimals,
  leftPlayers,
  orientation = 'vertical',
}: WordBuildingPlayerRailProps) {
  const t = useTranslations('games.wordBuilding');
  const tCommon = useTranslations('common');
  const isVertical = orientation === 'vertical';

  const scoreMap = new Map(scores.map(s => [s.playerId, s.score]));
  const allPlayerIds = [...playerNames.keys()];

  const sorted = [...allPlayerIds].sort((a, b) => {
    const sa = scoreMap.get(a) ?? 0;
    const sb = scoreMap.get(b) ?? 0;
    if (sb !== sa) return sb - sa;
    return a - b;
  });

  if (sorted.length === 0) {
    return (
      <p className="text-xs italic text-teal-800/60">{t('noPointsYet')}</p>
    );
  }

  return (
    <div
      className={
        isVertical
          ? 'flex w-full flex-col items-stretch gap-1.5'
          : 'flex w-full flex-wrap gap-1.5 sm:gap-2'
      }
      role="list"
      aria-label={t('scoreboardLabel')}
    >
      {sorted.map((pid) => {
        const name = playerNames.get(pid) ?? tCommon('playerNumber', { id: pid });
        const score = scoreMap.get(pid) ?? 0;
        const colour = playerColours[pid] ?? '#9CA3AF';
        const tier = playerAvatarTiers[pid] ?? 0;
        const animal = playerAvatarAnimals[pid] ?? 0;
        const isYou = pid === localPlayerId;
        const hasLeft = !!leftPlayers[pid];

        return (
          <div
            key={pid}
            role="listitem"
            className={[
              'inline-flex items-center gap-1.5 overflow-hidden rounded-xl border px-2 py-1.5 shadow-sm transition-colors sm:px-2.5 sm:py-2',
              isVertical ? 'w-full max-w-none' : 'max-w-full shrink',
              hasLeft
                ? 'border-gray-300 bg-gray-200/90 text-gray-600 opacity-75'
                : 'border-emerald-300 bg-emerald-100/90 text-emerald-950',
            ].join(' ')}
          >
            <HostCharacter
              theme="animals"
              clothesColor={colour}
              tier={tier}
              animal={animal}
              size="thumb"
              className="relative z-10 h-8 w-8 shrink-0 sm:h-9 sm:w-9"
            />

            <div
              className={[
                'relative z-10 min-w-0',
                isVertical ? 'flex-1' : 'max-w-[4.5rem] sm:max-w-[7rem]',
              ].join(' ')}
            >
              <div className="flex items-center gap-1">
                <span
                  className="truncate text-xs font-semibold sm:text-sm"
                  title={name}
                >
                  {name}
                </span>
                {isYou && (
                  <span className="hidden shrink-0 text-[10px] font-bold uppercase tracking-wide opacity-70 sm:inline">
                    {tCommon('you')}
                  </span>
                )}
              </div>
              <p className="text-sm font-black tabular-nums leading-tight sm:text-base">
                {score}
              </p>
            </div>

            {hasLeft && (
              <span
                className="inline-flex items-center text-gray-500"
                title={t('leftGame')}
              >
                <Icon name="close" size={16} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
