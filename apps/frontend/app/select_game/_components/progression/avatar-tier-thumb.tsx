'use client';

import { useTranslations } from 'next-intl';
import HostCharacter from '@/app/components/game/host-character';
import {
  getAvatarAnimalStyle,
  getAvatarTierStyle,
  resolveAvatarTier,
} from './avatar-tier-styles';
import { translateAvatarTier } from '@/lib/i18n/progression-labels';

type AvatarTierThumbProps = {
  tier: number;
  animal?: number;
  className?: string;
  title?: string;
};

export function AvatarTierThumb({
  tier,
  animal = 0,
  className = '',
  title,
}: AvatarTierThumbProps) {
  const t = useTranslations('games.lobby.progression');
  const definition = resolveAvatarTier(tier);
  const style = getAvatarTierStyle(definition);
  const animalStyle = getAvatarAnimalStyle(animal);
  const label = title ?? translateAvatarTier(t, definition.tier);

  return (
    <span
      className={[
        'inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-teal-700/30 bg-teal-50/80 shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={label}
      aria-label={label}
      data-tier={definition.tier}
      data-animal={animal}
      data-variant={definition.variantKey}
    >
      <HostCharacter
        theme="animals"
        tier={definition.tier}
        animal={animal}
        size="thumb"
        clothesColor={animalStyle.flairBg || style.flairBg}
        className="scale-[1.15]"
      />
    </span>
  );
}
