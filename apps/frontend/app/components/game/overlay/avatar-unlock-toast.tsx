'use client';

import { useTranslations } from 'next-intl';
import HostCharacter from '@/app/components/game/host-character';
import { translateAvatarTier } from '@/lib/i18n/progression-labels';

export type AvatarUnlockToastProps = {
  unlockTier: number;
  hostAnimal?: number;
};

export function AvatarUnlockToast({
  unlockTier,
  hostAnimal = 0,
}: AvatarUnlockToastProps) {
  const t = useTranslations('games.lobby.progression');

  return (
    <div
      className="absolute left-1/2 top-3 z-30 flex max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-teal-300/60 bg-teal-50/95 px-4 py-3 text-teal-950 shadow-lg sm:top-4"
      role="status"
      aria-live="polite"
    >
      <HostCharacter
        theme="animals"
        tier={unlockTier}
        animal={hostAnimal}
        size="default"
        className="shrink-0"
      />

      <div className="min-w-0">
        <p className="text-sm font-bold">{t('unlockToastTitle')}</p>
        <p className="text-xs text-teal-900/80">
          {t('unlockToastBody', {
            label: translateAvatarTier(t, unlockTier),
          })}
        </p>
      </div>
    </div>
  );
}
