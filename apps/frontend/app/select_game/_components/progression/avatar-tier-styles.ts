import {
  AVATAR_ANIMALS,
  AVATAR_TIERS,
  type AvatarTierDefinitionDto,
} from '@/lib/api/progression';

/** Visual styles keyed by AvatarTierDefinition.variantKey. */
const TIER_VARIANT_STYLES: Record<
  string,
  { flairBg: string; flairText: string }
> = {
  'tier-0': { flairBg: '#16A34A', flairText: '#F0FDF4' },
  'tier-1': { flairBg: '#2563EB', flairText: '#EFF6FF' },
  'tier-2': { flairBg: '#DB2777', flairText: '#FDF2F8' },
  'tier-3': { flairBg: '#EAB308', flairText: '#422006' },
  'tier-4': { flairBg: '#DC2626', flairText: '#FEF2F2' },
};

const FALLBACK_STYLE = TIER_VARIANT_STYLES['tier-0']!;
const FALLBACK_DEFINITION = AVATAR_TIERS[0]!;

/** Resolves a rank id to its AvatarTierDefinition. */
export function resolveAvatarTier(
  tier: number,
): AvatarTierDefinitionDto {
  return (
    AVATAR_TIERS.find((entry) => entry.tier === tier) ?? FALLBACK_DEFINITION
  );
}

export function getAvatarTierStyle(definition: AvatarTierDefinitionDto) {
  return TIER_VARIANT_STYLES[definition.variantKey] ?? FALLBACK_STYLE;
}

const ANIMAL_VARIANT_STYLES: Record<
  string,
  { flairBg: string; flairText: string }
> = {
  'animal-rabbit': { flairBg: '#F9A8D4', flairText: '#831843' },
  'animal-fox': { flairBg: '#EA580C', flairText: '#FFF7ED' },
  'animal-bear': { flairBg: '#A16207', flairText: '#FEF3C7' },
  'animal-tiger': { flairBg: '#F97316', flairText: '#1C1917' },
  'animal-lion': { flairBg: '#D97706', flairText: '#FFFBEB' },
};

export function resolveAvatarAnimal(animal: number) {
  return (
    AVATAR_ANIMALS.find((entry) => entry.id === animal) ?? AVATAR_ANIMALS[0]!
  );
}

export function getAvatarAnimalStyle(animal: number) {
  const definition = resolveAvatarAnimal(animal);
  return (
    ANIMAL_VARIANT_STYLES[definition.variantKey] ??
    ANIMAL_VARIANT_STYLES['animal-rabbit']!
  );
}
