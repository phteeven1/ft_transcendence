'use client';

import { useTranslations } from 'next-intl';
import { AvatarTierThumb } from './avatar-tier-thumb';
import { AvatarTierFlair } from './avatar-tier-flair';

type ProgressionPlayerSummaryProps = {
  avatarTier: number;
  avatarAnimal?: number;
  playerName: string;
  xp: number;
};

export function ProgressionPlayerSummary({
  avatarTier,
  avatarAnimal = 0,
  playerName,
  xp,
}: ProgressionPlayerSummaryProps) {
  const t = useTranslations('games.lobby.progression');

  return (
    <div className="mb-4 flex items-center gap-3">
      <AvatarTierThumb tier={avatarTier} animal={avatarAnimal} />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-heading text-lg font-bold text-foreground">
            {playerName}
          </p>
          <p className="text-sm text-muted-foreground">{t('xpValue', { xp })}</p>
        </div>
        <AvatarTierFlair tier={avatarTier} className="mt-1" />
      </div>
    </div>
  );
}
