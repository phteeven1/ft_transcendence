import type { useTranslations } from 'next-intl';

type ProgressionT = ReturnType<
  typeof useTranslations<'games.lobby.progression'>
>;

const TIER_KEYS = [
  'tiers.0',
  'tiers.1',
  'tiers.2',
  'tiers.3',
  'tiers.4',
] as const;

const ANIMAL_KEYS = [
  'animals.0',
  'animals.1',
  'animals.2',
  'animals.3',
  'animals.4',
] as const;

export function translateAvatarTier(t: ProgressionT, tier: number): string {
  const index = Number.isFinite(tier) ? Math.max(0, Math.floor(tier)) : 0;
  const key = TIER_KEYS[index] ?? TIER_KEYS[0];
  return t(key);
}

export function translateAvatarAnimal(t: ProgressionT, animal: number): string {
  const index = Number.isFinite(animal) ? Math.max(0, Math.floor(animal)) : 0;
  const key = ANIMAL_KEYS[index] ?? ANIMAL_KEYS[0];
  return t(key);
}
