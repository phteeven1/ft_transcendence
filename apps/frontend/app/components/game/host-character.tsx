'use client';

import { darken, lighten, parseHex } from './host-color-utils';

export type HostCharacterProps = {
  /** Player / outfit colour for the body clothes. */
  clothesColor?: string;
  /** Equipped avatar unlock tier (0–4). Drives accessory SVG layers. */
  tier?: number;
  className?: string;
  /** Soft bobbing animation (intro host). */
  animated?: boolean;
  title?: string;
};

const DEFAULT_CLOTHES = '#5EEAD4';

function TierAccessories({ tier }: { tier: number }) {
  switch (tier) {
    case 1:
      // Explorer — neck scarf
      return (
        <g aria-hidden="true">
          <path
            d="M58 108c8 10 36 10 44 0c-4 14-14 22-22 22s-18-8-22-22z"
            fill="#2563EB"
          />
          <path
            d="M78 118l4 22c1 4 6 4 7 0l3-22"
            fill="#1D4ED8"
          />
        </g>
      );
    case 2:
      // Wordsmith — round glasses
      return (
        <g aria-hidden="true">
          <circle
            cx="64"
            cy="66"
            r="12"
            fill="none"
            stroke="#7C3AED"
            strokeWidth="3"
          />
          <circle
            cx="96"
            cy="66"
            r="12"
            fill="none"
            stroke="#7C3AED"
            strokeWidth="3"
          />
          <path
            d="M76 66h8"
            stroke="#7C3AED"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M52 64h-8M108 64h8"
            stroke="#7C3AED"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>
      );
    case 3:
      // Champion — gold medal over chest badge
      return (
        <g aria-hidden="true">
          <path
            d="M72 104l8 10 8-10"
            fill="none"
            stroke="#CA8A04"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="80" cy="122" r="12" fill="#EAB308" />
          <circle cx="80" cy="122" r="7" fill="#FEF08A" />
          <path
            d="M80 117l1.6 3.2h3.4l-2.7 2.2 1 3.4L80 124l-3.3 1.8 1-3.4-2.7-2.2h3.4z"
            fill="#CA8A04"
          />
        </g>
      );
    case 4:
      // Legend — crown
      return (
        <g aria-hidden="true">
          <path
            d="M48 48l10 18 12-14 10 14 12-18 6 28H42z"
            fill="#F59E0B"
          />
          <path
            d="M48 48l10 18 12-14 10 14 12-18 6 28H42z"
            fill="#FCD34D"
            opacity="0.55"
          />
          <circle cx="48" cy="46" r="4" fill="#EF4444" />
          <circle cx="80" cy="34" r="4" fill="#3B82F6" />
          <circle cx="112" cy="46" r="4" fill="#22C55E" />
        </g>
      );
    default:
      // Apprentice — keep base ladle badge only (drawn on body)
      return null;
  }
}

export default function HostCharacter({
  clothesColor = DEFAULT_CLOTHES,
  tier = 0,
  className = '',
  animated = false,
  title,
}: HostCharacterProps) {
  const outfit = parseHex(clothesColor) ? clothesColor : DEFAULT_CLOTHES;
  const outfitLight = lighten(outfit, 0.42);
  const shadow = darken(outfit, 0.35);
  const resolvedTier = Number.isFinite(tier) ? Math.max(0, Math.floor(tier)) : 0;
  const showDefaultBadge = resolvedTier < 3;

  return (
    <svg
      viewBox="0 0 160 160"
      className={[animated ? 'word-soup-intro-host' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      data-tier={resolvedTier}
    >
      {/* Soft ground shadow */}
      <ellipse cx="80" cy="148" rx="42" ry="8" fill={shadow} opacity="0.22" />

      {/* Body / clothes */}
      <ellipse cx="80" cy="118" rx="36" ry="28" fill={outfit} />
      <ellipse cx="80" cy="118" rx="28" ry="20" fill={outfitLight} />

      {/* Head */}
      <circle cx="80" cy="68" r="44" fill="#FEF3C7" />
      <circle cx="80" cy="72" r="38" fill="#FFF7ED" />

      {/* Ears */}
      <ellipse cx="42" cy="42" rx="14" ry="18" fill="#FEF3C7" />
      <ellipse cx="42" cy="44" rx="8" ry="10" fill="#FDBA74" />
      <ellipse cx="118" cy="42" rx="14" ry="18" fill="#FEF3C7" />
      <ellipse cx="118" cy="44" rx="8" ry="10" fill="#FDBA74" />

      {/* Blush */}
      <ellipse cx="52" cy="78" rx="8" ry="5" fill="#FB7185" opacity="0.45" />
      <ellipse cx="108" cy="78" rx="8" ry="5" fill="#FB7185" opacity="0.45" />

      {/* Eyes */}
      <ellipse cx="64" cy="66" rx="7" ry="9" fill="#134E4A" />
      <ellipse cx="96" cy="66" rx="7" ry="9" fill="#134E4A" />
      <circle cx="66" cy="63" r="2.5" fill="#FFFFFF" />
      <circle cx="98" cy="63" r="2.5" fill="#FFFFFF" />

      {/* Smile */}
      <path
        d="M66 88c4 8 24 8 28 0"
        fill="none"
        stroke="#0F766E"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Tiny soup ladle badge (Apprentice–Wordsmith); Champion medal replaces it */}
      {showDefaultBadge && (
        <>
          <circle cx="80" cy="118" r="10" fill="#F59E0B" />
          <rect x="77" y="104" width="6" height="12" rx="2" fill="#D97706" />
        </>
      )}

      <TierAccessories tier={resolvedTier} />
    </svg>
  );
}
