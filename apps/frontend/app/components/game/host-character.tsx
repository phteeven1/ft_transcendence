'use client';

import { ThemeFigure, type AvatarThemeKey } from './avatars';
import { darken, lighten, parseHex } from './host-color-utils';

/**
 * Visual scale presets.
 * - `thumb` — lobby / scoreboard chips
 * - `default` — mid-size UI (banners, pickers)
 * - `presentation` — intro / outro / announcement overlays
 */
export type HostCharacterSize = 'thumb' | 'default' | 'presentation';

export type HostCharacterProps = {
  /** Player / outfit colour tint for the figure. */
  clothesColor?: string;
  /**
   * Avatar family. `animals` is the player roster;
   * `classic` keeps the soft soup-host (intro default).
   */
  theme?: AvatarThemeKey | string;
  /** Equipped XP rank (0–4) — drives cosmetic upgrades. */
  tier?: number;
  /** Equipped animal species (0–4). Only used when theme is `animals`. */
  animal?: number;
  /**
   * Size preset. Prefer this over ad-hoc className when targeting
   * intro/outro overlays (`presentation`) or dense UI (`thumb`).
   */
  size?: HostCharacterSize;
  className?: string;
  /** Soft bobbing animation (intro host). */
  animated?: boolean;
  title?: string;
};

const DEFAULT_CLOTHES = '#5EEAD4';
/** Progression avatars default to the animals roster. */
const DEFAULT_THEME: AvatarThemeKey = 'animals';

const SIZE_CLASS: Record<HostCharacterSize, string> = {
  thumb: 'h-10 w-10',
  default: 'h-16 w-16',
  presentation: 'h-36 w-36 sm:h-44 sm:w-44',
};

export default function HostCharacter({
  clothesColor = DEFAULT_CLOTHES,
  theme = DEFAULT_THEME,
  tier = 0,
  animal = 0,
  size,
  className = '',
  animated = false,
  title,
}: HostCharacterProps) {
  const outfit = parseHex(clothesColor) ? clothesColor : DEFAULT_CLOTHES;
  const outfitLight = lighten(outfit, 0.42);
  const shadow = darken(outfit, 0.35);
  const resolvedTier = Number.isFinite(tier) ? Math.max(0, Math.floor(tier)) : 0;
  const resolvedAnimal = Number.isFinite(animal)
    ? Math.max(0, Math.floor(animal))
    : 0;
  const resolvedTheme = (theme || DEFAULT_THEME).toLowerCase();
  const isPresentation = size === 'presentation';

  const sizeClass = size ? SIZE_CLASS[size] : '';

  return (
    <svg
      viewBox="0 0 160 160"
      className={[
        animated ? 'word-soup-intro-host' : '',
        sizeClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      data-tier={resolvedTier}
      data-animal={resolvedAnimal}
      data-theme={resolvedTheme}
      data-size={size ?? 'custom'}
    >
      <ThemeFigure
        theme={resolvedTheme}
        stage={resolvedTier}
        animal={resolvedAnimal}
        outfit={outfit}
        outfitLight={outfitLight}
        shadow={shadow}
        presentation={isPresentation}
      />
    </svg>
  );
}
