'use client';

import { useTranslations } from 'next-intl';
import type { PlayerProgressionResponseDto } from '@/lib/api/progression';
import { AvatarTierThumb } from './avatar-tier-thumb';
import { AvatarTierFlair } from './avatar-tier-flair';

type AvatarEquipPickerProps = {
  progression: PlayerProgressionResponseDto;
  equipping: boolean;
  equipError: string | null;
  onEquip: (tier: number) => void;
};

export function AvatarEquipPicker({
  progression,
  equipping,
  equipError,
  onEquip,
}: AvatarEquipPickerProps) {
  const t = useTranslations('games.lobby.progression');
  const unlocked = new Set(progression.unlockedTiers);

  return (
    <div className="mb-4 rounded-xl border border-border/60 bg-white/80 px-3 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {t('equipTitle')}
        </h3>
        {equipping && (
          <span className="text-xs text-muted-foreground">{t('equipping')}</span>
        )}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{t('equipHint')}</p>

      {equipError && (
        <p className="mb-2 rounded-lg bg-rose-50 px-2 py-1.5 text-xs text-rose-700">
          {t('equipFailed')}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {progression.tiers.map((tierDef) => {
          const isUnlocked = unlocked.has(tierDef.tier);
          const isEquipped = progression.avatarTier === tierDef.tier;

          return (
            <li key={tierDef.tier}>
              <button
                type="button"
                disabled={!isUnlocked || isEquipped || equipping}
                onClick={() => onEquip(tierDef.tier)}
                aria-pressed={isEquipped}
                aria-label={
                  isUnlocked
                    ? t('equipTier', { label: tierDef.label })
                    : t('lockedTier', {
                        label: tierDef.label,
                        xp: tierDef.xpRequired,
                      })
                }
                className={[
                  'flex w-full flex-col items-center gap-1.5 rounded-xl border px-2 py-2 text-center transition',
                  isEquipped
                    ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-500/40'
                    : isUnlocked
                      ? 'border-border/60 bg-white/90 hover:border-teal-500 hover:bg-teal-50/60'
                      : 'cursor-not-allowed border-dashed border-border/40 bg-muted/30 opacity-60',
                ].join(' ')}
              >
                <span className="relative">
                  <AvatarTierThumb tier={tierDef.tier} />
                  {!isUnlocked && (
                    <span
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 text-white"
                      aria-hidden="true"
                    >
                      <LockIcon className="h-3.5 w-3.5" />
                    </span>
                  )}
                </span>
                <AvatarTierFlair tier={tierDef.tier} />
                <span className="text-[0.65rem] text-muted-foreground">
                  {isEquipped
                    ? t('equipped')
                    : isUnlocked
                      ? t('xpValue', { xp: tierDef.xpRequired })
                      : t('unlockAt', { xp: tierDef.xpRequired })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LockIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
