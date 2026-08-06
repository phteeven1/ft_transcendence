'use client';

import HostCharacter from '@/app/components/game/host-character';
import {
  getAvatarTierStyle,
  resolveAvatarTier,
} from './avatar-tier-styles';

type AvatarTierThumbProps = {
  tier: number;
  className?: string;
  title?: string;
};

export function AvatarTierThumb({
  tier,
  className = '',
  title,
}: AvatarTierThumbProps) {
  const definition = resolveAvatarTier(tier);
  const style = getAvatarTierStyle(definition);
  const label = title ?? definition.label;

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
      data-variant={definition.variantKey}
    >
      <HostCharacter
        tier={definition.tier}
        clothesColor={style.flairBg}
        className="h-full w-full scale-[1.15]"
      />
    </span>
  );
}
