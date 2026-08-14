type RankAccessoryProps = {
  tier: number;
};

type CrownLayout = {
  dx: number;
  dy: number;
  scale: number;
};

/** Lion layout — full scale, resting on the head top without vertical nudge. */
const CROWN_LAYOUT: CrownLayout = { dx: 0, dy: 0, scale: 1.05 };

/** Legend-tier crown, anchored to the top of the 160×160 head box. */
function Crown({ layout }: { layout: CrownLayout }) {
  const anchorX = 80;
  const anchorY = 26;
  const { dx, dy, scale } = layout;

  return (
    <g
      transform={`translate(${anchorX + dx} ${anchorY + dy}) scale(${scale}) translate(${-anchorX} ${-anchorY})`}
    >
      <path
        d="M58 26 L64 10 L72 20 L80 6 L88 20 L96 10 L102 26 L102 30 L58 30 Z"
        fill="#F59E0B"
      />
      <path
        d="M58 26 L64 10 L72 20 L80 6 L88 20 L96 10 L102 26 L102 30 L58 30 Z"
        fill="#FCD34D"
        opacity="0.55"
      />
      <circle cx="64" cy="10" r="3.5" fill="#EF4444" />
      <circle cx="80" cy="6" r="3.5" fill="#3B82F6" />
      <circle cx="96" cy="10" r="3.5" fill="#22C55E" />
    </g>
  );
}

/** XP rank cosmetics overlaid on classic or animal figures. */
export function RankAccessories({ tier }: RankAccessoryProps) {
  switch (tier) {
    case 1:
      return (
        <g aria-hidden="true">
          <path
            d="M58 108c8 10 36 10 44 0c-4 14-14 22-22 22s-18-8-22-22z"
            fill="#2563EB"
          />
          <path d="M78 118l4 22c1 4 6 4 7 0l3-22" fill="#1D4ED8" />
        </g>
      );
    case 2:
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
      return (
        <g aria-hidden="true">
          <Crown layout={CROWN_LAYOUT} />
        </g>
      );
    default:
      return null;
  }
}
