import { RankAccessories } from './rank-accessories';
import type { ThemeFigureProps } from './types';
import { clampStage } from './types';

/** Soft soup-host starter — same look as the Word Soup intro character. */
export function ClassicFigure({
  stage,
  outfit,
  outfitLight,
  shadow,
  presentation = false,
}: ThemeFigureProps) {
  const s = clampStage(stage);
  const showLadle = s < 3;
  const strokeBoost = presentation ? 0.5 : 0;

  return (
    <g>
      <ellipse cx="80" cy="148" rx="42" ry="8" fill={shadow} opacity="0.22" />
      <ellipse cx="80" cy="118" rx="36" ry="28" fill={outfit} />
      <ellipse cx="80" cy="118" rx="28" ry="20" fill={outfitLight} />
      <circle cx="80" cy="68" r="44" fill="#FEF3C7" />
      <circle cx="80" cy="72" r="38" fill="#FFF7ED" />
      <ellipse cx="42" cy="42" rx="14" ry="18" fill="#FEF3C7" />
      <ellipse cx="42" cy="44" rx="8" ry="10" fill="#FDBA74" />
      <ellipse cx="118" cy="42" rx="14" ry="18" fill="#FEF3C7" />
      <ellipse cx="118" cy="44" rx="8" ry="10" fill="#FDBA74" />
      <ellipse cx="52" cy="78" rx="8" ry="5" fill="#FB7185" opacity="0.45" />
      <ellipse cx="108" cy="78" rx="8" ry="5" fill="#FB7185" opacity="0.45" />
      <ellipse cx="64" cy="66" rx="7" ry="9" fill="#134E4A" />
      <ellipse cx="96" cy="66" rx="7" ry="9" fill="#134E4A" />
      <circle cx="66" cy="63" r="2.5" fill="#FFFFFF" />
      <circle cx="98" cy="63" r="2.5" fill="#FFFFFF" />
      <path
        d="M66 88c4 8 24 8 28 0"
        fill="none"
        stroke="#0F766E"
        strokeWidth={3 + strokeBoost}
        strokeLinecap="round"
      />
      {showLadle && (
        <>
          <circle cx="80" cy="118" r="10" fill="#F59E0B" />
          <rect x="77" y="104" width="6" height="12" rx="2" fill="#D97706" />
        </>
      )}
      <RankAccessories tier={s} />
    </g>
  );
}
