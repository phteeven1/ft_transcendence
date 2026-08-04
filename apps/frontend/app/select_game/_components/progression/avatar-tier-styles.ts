import {
  AVATAR_TIERS,
  type AvatarTierDefinitionDto,
} from '@/lib/api/progression';

/** Visual styles keyed by AvatarTierDefinition.variantKey. */
const TIER_VARIANT_STYLES: Record<
  string,
  { flairBg: string; flairText: string }
> = {
  'tier-0': { flairBg: '#16A34A', flairText: '#F0FDF4' }, // green
  'tier-1': { flairBg: '#2563EB', flairText: '#EFF6FF' }, // blue
  'tier-2': { flairBg: '#DB2777', flairText: '#FDF2F8' }, // pink
  'tier-3': { flairBg: '#EAB308', flairText: '#422006' }, // yellow
  'tier-4': { flairBg: '#DC2626', flairText: '#FEF2F2' }, // red
};

const FALLBACK_STYLE = TIER_VARIANT_STYLES['tier-0']!;
const FALLBACK_DEFINITION = AVATAR_TIERS[0]!;

/** Resolves an equipped tier id to its AvatarTierDefinition. */
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
