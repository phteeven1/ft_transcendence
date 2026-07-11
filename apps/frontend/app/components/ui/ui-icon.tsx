import { SVGAttributes } from 'react';

export type IconName =
  | 'chevron-down'
  | 'close'
  | 'user'
  | 'users'
  | 'book'
  | 'game'
  | 'check';

const PATHS: Record<IconName, string | string[]> = {
  'chevron-down': 'M6 9l6 6 6-6',
  close: 'M18 6L6 18M6 6l12 12',
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
  users: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  game: 'M6 12h4M8 10v4M15 13h.01M18 11h.01M5 8h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z',
  check: 'M5 12l4 4L19 6',
};

export interface IconProps extends SVGAttributes<SVGSVGElement> {
  name: IconName;
  size?: number;
}

/** Consistent SVG icons for the Dicteé design system (stroke-based). */
export function Icon({ name, size = 20, className = '', ...props }: IconProps) {
  const paths = PATHS[name];
  const dList = Array.isArray(paths) ? paths : [paths];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props['aria-label'] ? undefined : true}
      className={['shrink-0', className].filter(Boolean).join(' ')}
      {...props}
    >
      {dList.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
