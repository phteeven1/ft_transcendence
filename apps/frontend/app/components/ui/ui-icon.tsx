'use client';

import type { Icon as PhosphorIcon, IconWeight } from '@phosphor-icons/react';
import {
  Book,
  CircleNotch,
  Confetti,
  Crown,
  DotsThree,
  GameController,
  Gear,
  Info,
  Lock,
  PencilSimple,
  Play,
  Plus,
  PuzzlePiece,
  SignOut,
  Snowflake,
  Trash,
  UploadSimple,
  User,
  Users,
  X,
} from '@phosphor-icons/react';

export type IconName =
  | 'close'
  | 'user'
  | 'users'
  | 'book'
  | 'game'
  | 'lock'
  | 'snowflake'
  | 'info'
  | 'spinner'
  | 'dots-three'
  | 'plus'
  | 'pencil'
  | 'sign-out'
  | 'trash'
  | 'play'
  | 'crown'
  | 'puzzle'
  | 'gear'
  | 'upload'
  | 'confetti';

const ICONS: Record<IconName, PhosphorIcon> = {
  close: X,
  user: User,
  users: Users,
  book: Book,
  game: GameController,
  lock: Lock,
  snowflake: Snowflake,
  info: Info,
  spinner: CircleNotch,
  'dots-three': DotsThree,
  plus: Plus,
  pencil: PencilSimple,
  'sign-out': SignOut,
  trash: Trash,
  play: Play,
  crown: Crown,
  puzzle: PuzzlePiece,
  gear: Gear,
  upload: UploadSimple,
  confetti: Confetti,
};

export type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  weight?: IconWeight;
  'aria-label'?: string;
};

/** Consistent Phosphor icons for the Dicteé design system. */
export function Icon({
  name,
  size = 20,
  className = '',
  weight = 'bold',
  'aria-label': ariaLabel,
}: IconProps) {
  const Glyph = ICONS[name];

  return (
    <Glyph
      size={size}
      weight={weight}
      className={['shrink-0', className].filter(Boolean).join(' ')}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
    />
  );
}
