'use client';

import { useTranslations } from 'next-intl';
import {
  getAvatarTierStyle,
  resolveAvatarTier,
} from './avatar-tier-styles';
import { translateAvatarTier } from '@/lib/i18n/progression-labels';

type AvatarTierFlairProps = {
  tier: number;
  className?: string;
  /** Compact size for dense rows (e.g. leaderboard table). */
  size?: 'sm' | 'md';
};

export function AvatarTierFlair({
  tier,
  className = '',
  size = 'md',
}: AvatarTierFlairProps) {
  const t = useTranslations('games.lobby.progression');
  const definition = resolveAvatarTier(tier);
  const style = getAvatarTierStyle(definition);
  const label = translateAvatarTier(t, definition.tier);

  const sizeClass =
    size === 'sm'
      ? 'h-5 pl-1.5 pr-2.5 text-[0.6rem]'
      : 'h-6 pl-2 pr-3 text-[0.65rem]';

  return (
    <span
      className={[
        'inline-flex shrink-0 items-center font-heading font-bold uppercase tracking-wide',
        sizeClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        backgroundColor: style.flairBg,
        color: style.flairText,
        clipPath:
          'polygon(0 0, calc(100% - 0.45em) 0, 100% 50%, calc(100% - 0.45em) 100%, 0 100%)',
      }}
      title={label}
      aria-label={label}
      data-tier={definition.tier}
      data-variant={definition.variantKey}
    >
      {label}
    </span>
  );
}
