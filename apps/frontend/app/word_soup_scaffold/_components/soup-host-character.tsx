'use client';

type SoupHostCharacterProps = {
  /** Player / outfit colour for the body clothes. */
  clothesColor?: string;
  className?: string;
  /** Soft bobbing animation (intro host). */
  animated?: boolean;
  title?: string;
};

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${clampByte(r).toString(16).padStart(2, '0')}${clampByte(g)
    .toString(16)
    .padStart(2, '0')}${clampByte(b).toString(16).padStart(2, '0')}`;
}

function lighten(hex: string, amount = 0.45): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex({
    r: rgb.r + (255 - rgb.r) * amount,
    g: rgb.g + (255 - rgb.g) * amount,
    b: rgb.b + (255 - rgb.b) * amount,
  });
}

function darken(hex: string, amount = 0.22): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex({
    r: rgb.r * (1 - amount),
    g: rgb.g * (1 - amount),
    b: rgb.b * (1 - amount),
  });
}

const DEFAULT_CLOTHES = '#5EEAD4';

/** Soft Animal Crossing–style host used in intro + scoreboard avatars. */
export default function SoupHostCharacter({
  clothesColor = DEFAULT_CLOTHES,
  className = '',
  animated = false,
  title,
}: SoupHostCharacterProps) {
  const outfit = parseHex(clothesColor) ? clothesColor : DEFAULT_CLOTHES;
  const outfitLight = lighten(outfit, 0.42);
  const shadow = darken(outfit, 0.35);

  return (
    <svg
      viewBox="0 0 160 160"
      className={[animated ? 'word-soup-intro-host' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
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

      {/* Tiny soup ladle badge */}
      <circle cx="80" cy="118" r="10" fill="#F59E0B" />
      <rect x="77" y="104" width="6" height="12" rx="2" fill="#D97706" />
    </svg>
  );
}
