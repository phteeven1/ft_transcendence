import { RankAccessories } from './rank-accessories';
import type { ThemeFigureProps } from './types';
import { clampAnimal, clampStage } from './types';

/** Shared soft face used by every Animal Crossing–style critter. */
function SoftFace({
  eyeFill = '#1F2937',
  smileStroke = '#4B5563',
  presentation = false,
}: {
  eyeFill?: string;
  smileStroke?: string;
  presentation?: boolean;
}) {
  return (
    <g>
      <ellipse cx="52" cy="78" rx="8" ry="5" fill="#FB7185" opacity="0.42" />
      <ellipse cx="108" cy="78" rx="8" ry="5" fill="#FB7185" opacity="0.42" />
      <ellipse cx="64" cy="66" rx="7" ry="9" fill={eyeFill} />
      <ellipse cx="96" cy="66" rx="7" ry="9" fill={eyeFill} />
      <circle cx="66" cy="63" r="2.5" fill="#FFFFFF" />
      <circle cx="98" cy="63" r="2.5" fill="#FFFFFF" />
      <path
        d="M66 88c4 8 24 8 28 0"
        fill="none"
        stroke={smileStroke}
        strokeWidth={presentation ? 3.5 : 3}
        strokeLinecap="round"
      />
    </g>
  );
}

function SoftShirt({
  outfit,
  outfitLight,
}: {
  outfit: string;
  outfitLight: string;
}) {
  return (
    <g>
      <ellipse cx="80" cy="120" rx="34" ry="26" fill={outfit} />
      <ellipse cx="80" cy="120" rx="26" ry="18" fill={outfitLight} />
    </g>
  );
}

/** Stage 0 — rabbit. */
function Rabbit({
  outfit,
  outfitLight,
  shadow,
  presentation,
}: Omit<ThemeFigureProps, 'stage'>) {
  const fur = '#F5F0E6';
  const furShade = '#E7DFD2';
  const inner = '#F9A8D4';

  return (
    <g>
      <ellipse cx="80" cy="148" rx="40" ry="7" fill={shadow} opacity="0.22" />
      {/* Tall ears */}
      <ellipse cx="52" cy="28" rx="12" ry="28" fill={fur} />
      <ellipse cx="52" cy="30" rx="6" ry="18" fill={inner} opacity="0.85" />
      <ellipse cx="108" cy="28" rx="12" ry="28" fill={fur} />
      <ellipse cx="108" cy="30" rx="6" ry="18" fill={inner} opacity="0.85" />
      <SoftShirt outfit={outfit} outfitLight={outfitLight} />
      <ellipse cx="58" cy="136" rx="11" ry="12" fill={furShade} />
      <ellipse cx="102" cy="136" rx="11" ry="12" fill={furShade} />
      <circle cx="80" cy="68" r="44" fill={fur} />
      <circle cx="80" cy="72" r="36" fill="#FFFCFA" />
      {/* Tiny nose */}
      <ellipse cx="80" cy="80" rx="5" ry="3.5" fill="#F472B6" />
      <path
        d="M80 83v6"
        stroke="#F472B6"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <SoftFace presentation={presentation} smileStroke="#9D174D" />
      {presentation && (
        <g opacity="0.55" aria-hidden="true">
          <circle cx="28" cy="54" r="2.5" fill="#F9A8D4" />
          <circle cx="132" cy="48" r="2" fill="#F9A8D4" />
        </g>
      )}
    </g>
  );
}

/** Stage 1 — fox. */
function Fox({
  outfit,
  outfitLight,
  shadow,
  presentation,
}: Omit<ThemeFigureProps, 'stage'>) {
  const fur = '#EA580C';
  const furLight = '#FDBA74';
  const cream = '#FFF7ED';

  return (
    <g>
      <ellipse cx="80" cy="148" rx="40" ry="7" fill={shadow} opacity="0.22" />
      {/* Bushy tail */}
      <path
        d="M118 112c30-10 36 20 14 30c14 4 6 16-10 10"
        fill={fur}
      />
      <path d="M124 116c14-2 16 10 4 14" fill={cream} />
      <SoftShirt outfit={outfit} outfitLight={outfitLight} />
      <ellipse cx="58" cy="136" rx="11" ry="12" fill={fur} />
      <ellipse cx="102" cy="136" rx="11" ry="12" fill={fur} />
      {/* Pointed ears */}
      <path d="M40 54L52 18l18 28z" fill={fur} />
      <path d="M48 48l6-16 8 14z" fill="#F97316" />
      <path d="M120 54L108 18L90 46z" fill={fur} />
      <path d="M112 48l-6-16-8 14z" fill="#F97316" />
      <circle cx="80" cy="68" r="44" fill={fur} />
      <ellipse cx="80" cy="78" rx="28" ry="26" fill={cream} />
      {/* Snout */}
      <ellipse cx="80" cy="84" rx="14" ry="10" fill={furLight} />
      <ellipse cx="80" cy="86" rx="5" ry="3.5" fill="#1F2937" />
      <SoftFace
        eyeFill="#431407"
        smileStroke="#9A3412"
        presentation={presentation}
      />
      {presentation && (
        <g opacity="0.5" aria-hidden="true">
          <circle cx="26" cy="60" r="2.5" fill="#FDBA74" />
          <circle cx="134" cy="52" r="2" fill="#FDBA74" />
        </g>
      )}
    </g>
  );
}

/** Stage 2 — bear. */
function Bear({
  outfit,
  outfitLight,
  shadow,
  presentation,
}: Omit<ThemeFigureProps, 'stage'>) {
  const fur = '#A16207';
  const furLight = '#D6A45A';
  const muzzle = '#FEF3C7';

  return (
    <g>
      <ellipse cx="80" cy="148" rx="42" ry="8" fill={shadow} opacity="0.22" />
      <SoftShirt outfit={outfit} outfitLight={outfitLight} />
      <ellipse cx="56" cy="136" rx="13" ry="13" fill={fur} />
      <ellipse cx="104" cy="136" rx="13" ry="13" fill={fur} />
      {/* Round ears */}
      <circle cx="40" cy="40" r="16" fill={fur} />
      <circle cx="40" cy="42" r="9" fill={furLight} />
      <circle cx="120" cy="40" r="16" fill={fur} />
      <circle cx="120" cy="42" r="9" fill={furLight} />
      <circle cx="80" cy="70" r="46" fill={fur} />
      <circle cx="80" cy="76" r="36" fill={furLight} opacity="0.35" />
      <ellipse cx="80" cy="86" rx="22" ry="16" fill={muzzle} />
      <ellipse cx="80" cy="82" rx="6" ry="4.5" fill="#78350F" />
      <SoftFace
        eyeFill="#451A03"
        smileStroke="#78350F"
        presentation={presentation}
      />
      {presentation && (
        <g opacity="0.45" aria-hidden="true">
          <circle cx="24" cy="70" r="2.5" fill="#FBBF24" />
          <circle cx="136" cy="64" r="2" fill="#FBBF24" />
        </g>
      )}
    </g>
  );
}

/** Stage 3 — tiger. */
function Tiger({
  outfit,
  outfitLight,
  shadow,
  presentation,
}: Omit<ThemeFigureProps, 'stage'>) {
  const fur = '#F97316';
  const cream = '#FFF7ED';
  const stripe = '#1C1917';

  return (
    <g>
      <ellipse cx="80" cy="148" rx="40" ry="7" fill={shadow} opacity="0.22" />
      {/* Soft striped tail */}
      <path
        d="M116 114c26-6 30 22 10 28c12 6 2 16-12 10"
        fill={fur}
      />
      <path
        d="M128 118c6 0 8 6 2 10"
        stroke={stripe}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <SoftShirt outfit={outfit} outfitLight={outfitLight} />
      <ellipse cx="58" cy="136" rx="11" ry="12" fill={fur} />
      <ellipse cx="102" cy="136" rx="11" ry="12" fill={fur} />
      {/* Ears */}
      <path d="M42 52L52 22l16 24z" fill={fur} />
      <path d="M118 52L108 22L92 46z" fill={fur} />
      <circle cx="80" cy="68" r="44" fill={fur} />
      {/* Muzzle patch */}
      <ellipse cx="80" cy="86" rx="24" ry="18" fill={cream} />
      {/* Signature stripes */}
      <path
        d="M58 48c2 10 4 18 2 28M80 40c0 12 0 22 0 34M102 48c-2 10-4 18-2 28"
        stroke={stripe}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      <ellipse cx="80" cy="84" rx="5" ry="3.5" fill="#1C1917" />
      <SoftFace
        eyeFill="#1C1917"
        smileStroke="#9A3412"
        presentation={presentation}
      />
      {presentation && (
        <g opacity="0.5" aria-hidden="true">
          <circle cx="26" cy="58" r="2.5" fill="#FDBA74" />
          <circle cx="134" cy="50" r="2" fill="#FDBA74" />
        </g>
      )}
    </g>
  );
}

/** Stage 4 — lion. */
function Lion({
  outfit,
  outfitLight,
  shadow,
  presentation,
}: Omit<ThemeFigureProps, 'stage'>) {
  const mane = '#D97706';
  const maneDark = '#B45309';
  const fur = '#FBBF24';
  const cream = '#FFFBEB';

  return (
    <g>
      <ellipse cx="80" cy="148" rx="42" ry="8" fill={shadow} opacity="0.22" />
      {/* Fluffy mane halo */}
      <circle cx="48" cy="48" r="20" fill={mane} />
      <circle cx="112" cy="48" r="20" fill={mane} />
      <circle cx="40" cy="78" r="18" fill={maneDark} />
      <circle cx="120" cy="78" r="18" fill={maneDark} />
      <circle cx="56" cy="108" r="16" fill={mane} />
      <circle cx="104" cy="108" r="16" fill={mane} />
      <circle cx="80" cy="36" r="18" fill={maneDark} />
      <SoftShirt outfit={outfit} outfitLight={outfitLight} />
      <ellipse cx="58" cy="136" rx="12" ry="12" fill={fur} />
      <ellipse cx="102" cy="136" rx="12" ry="12" fill={fur} />
      <circle cx="80" cy="70" r="40" fill={fur} />
      <circle cx="80" cy="74" r="32" fill={cream} opacity="0.55" />
      {/* Soft ears peeking through mane */}
      <ellipse cx="48" cy="42" rx="10" ry="12" fill={fur} />
      <ellipse cx="112" cy="42" rx="10" ry="12" fill={fur} />
      <ellipse cx="80" cy="84" rx="6" ry="4" fill="#92400E" />
      <SoftFace
        eyeFill="#451A03"
        smileStroke="#92400E"
        presentation={presentation}
      />
      {presentation && (
        <g opacity="0.55" aria-hidden="true">
          <circle cx="22" cy="56" r="2.5" fill="#FCD34D" />
          <circle cx="138" cy="48" r="2" fill="#FCD34D" />
          <circle cx="80" cy="18" r="2" fill="#FDE68A" />
        </g>
      )}
    </g>
  );
}

/**
 * Animals roster: species from `animal`, XP rank cosmetics from `stage`.
 * 0 rabbit → 1 fox → 2 bear → 3 tiger → 4 lion
 */
export function AnimalsFigure({
  stage,
  animal = 0,
  outfit,
  outfitLight,
  shadow,
  presentation = false,
}: ThemeFigureProps) {
  const props = { outfit, outfitLight, shadow, presentation };
  const species = clampAnimal(animal);
  const rank = clampStage(stage);

  return (
    <g>
      {species === 1 ? (
        <Fox {...props} />
      ) : species === 2 ? (
        <Bear {...props} />
      ) : species === 3 ? (
        <Tiger {...props} />
      ) : species === 4 ? (
        <Lion {...props} />
      ) : (
        <Rabbit {...props} />
      )}
      <RankAccessories tier={rank} />
    </g>
  );
}
