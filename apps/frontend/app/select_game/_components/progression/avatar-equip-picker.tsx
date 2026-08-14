'use client';

import { useTranslations } from 'next-intl';
import type { PlayerProgressionResponseDto } from '@/lib/api/progression';
import { AVATAR_ANIMALS } from '@/lib/api/progression';
import { AvatarTierThumb } from './avatar-tier-thumb';
import { AvatarTierFlair } from './avatar-tier-flair';
import {
  getAvatarAnimalStyle,
} from './avatar-tier-styles';
import HostCharacter from '@/app/components/game/host-character';
import {
  translateAvatarAnimal,
  translateAvatarTier,
} from '@/lib/i18n/progression-labels';

type AvatarEquipPickerProps = {
  progression: PlayerProgressionResponseDto;
  equipping: boolean;
  equipError: string | null;
  onEquipAnimal: (animal: number) => void;
};

export function AvatarEquipPicker({
  progression,
  equipping,
  equipError,
  onEquipAnimal,
}: AvatarEquipPickerProps) {
  const t = useTranslations('games.lobby.progression');
  const unlocked = new Set(progression.unlockedTiers);
  const currentRank = progression.avatarTier;
  const selectedAnimal = progression.avatarAnimal ?? 0;
  const animals = progression.animals?.length
    ? progression.animals
    : AVATAR_ANIMALS;

  return (
    <div className="space-y-4">
      {equipError && (
        <p className="rounded-lg bg-rose-50 px-2 py-1.5 text-xs text-rose-700">
          {t('equipFailed')}
        </p>
      )}

      <section className="rounded-xl border border-border/60 bg-white/80 px-3 py-3">
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t('rankTitle')}
          </h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{t('rankHint')}</p>

        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {progression.tiers.map((tierDef) => {
            const isUnlocked = unlocked.has(tierDef.tier);
            const isCurrent = currentRank === tierDef.tier;
            const tierLabel = translateAvatarTier(t, tierDef.tier);

            return (
              <li key={tierDef.tier}>
                <div
                  aria-current={isCurrent ? 'true' : undefined}
                  aria-label={
                    isCurrent
                      ? t('currentRank', { label: tierLabel })
                      : isUnlocked
                        ? t('unlockedRank', {
                            label: tierLabel,
                            xp: tierDef.xpRequired,
                          })
                        : t('lockedTier', {
                            label: tierLabel,
                            xp: tierDef.xpRequired,
                          })
                  }
                  className={[
                    'flex w-full flex-col items-center gap-1.5 rounded-xl border px-2 py-2 text-center',
                    isCurrent
                      ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-500/40'
                      : isUnlocked
                        ? 'border-border/60 bg-white/90'
                        : 'border-dashed border-border/40 bg-muted/30 opacity-60',
                  ].join(' ')}
                >
                  <span className="relative">
                    <AvatarTierThumb
                      tier={tierDef.tier}
                      animal={selectedAnimal}
                    />
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
                    {isCurrent
                      ? t('currentRankLabel')
                      : isUnlocked
                        ? t('xpValue', { xp: tierDef.xpRequired })
                        : t('unlockAt', { xp: tierDef.xpRequired })}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-border/60 bg-white/80 px-3 py-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t('animalTitle')}
          </h3>
          {equipping && (
            <span className="text-xs text-muted-foreground">{t('equipping')}</span>
          )}
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{t('animalHint')}</p>

        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {animals.map((animalDef) => {
            const isEquipped = selectedAnimal === animalDef.id;
            const style = getAvatarAnimalStyle(animalDef.id);
            const animalLabel = translateAvatarAnimal(t, animalDef.id);

            return (
              <li key={animalDef.id}>
                <button
                  type="button"
                  disabled={isEquipped || equipping}
                  onClick={() => onEquipAnimal(animalDef.id)}
                  aria-pressed={isEquipped}
                  aria-label={t('equipAnimal', { label: animalLabel })}
                  className={[
                    'flex w-full flex-col items-center gap-1.5 rounded-xl border px-2 py-2 text-center transition',
                    isEquipped
                      ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-500/40'
                      : 'border-border/60 bg-white/90 hover:border-teal-500 hover:bg-teal-50/60',
                  ].join(' ')}
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-teal-700/30 bg-teal-50/80 shadow-sm">
                    <HostCharacter
                      theme="animals"
                      animal={animalDef.id}
                      tier={currentRank}
                      size="thumb"
                      clothesColor={style.flairBg}
                      className="scale-[1.15]"
                    />
                  </span>
                  <span
                    className="inline-flex h-6 items-center rounded-full px-2 text-[0.65rem] font-heading font-bold uppercase tracking-wide"
                    style={{
                      backgroundColor: style.flairBg,
                      color: style.flairText,
                    }}
                  >
                    {animalLabel}
                  </span>
                  <span className="text-[0.65rem] text-muted-foreground">
                    {isEquipped ? t('equipped') : t('animalFree')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
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
