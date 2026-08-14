'use client';

import type { Icon as PhosphorIcon, IconWeight } from '@phosphor-icons/react';
import {
  ArrowLeft,
  Book,
  CaretDown,
  Check,
  CircleNotch,
  Crown,
	DotsThree,
  EnvelopeSimple,
  GameController,
  Gear,
  Info,
  Key,
  Lock,
  PencilSimple,
  Play,
  Plus,
  PuzzlePiece,
  SignOut,
  Snowflake,
  Stop,
  Trash,
  User,
  UserPlus,
  Users,
  X,
} from '@phosphor-icons/react';

export type IconName =
  | 'chevron-down'
  | 'close'
  | 'user'
  | 'users'
  | 'book'
  | 'game'
  | 'check'
  | 'lock'
  | 'snowflake'
  | 'info'
  | 'spinner'
  | 'dots-three'
  | 'envelope'
  | 'user-plus'
  | 'plus'
  | 'pencil'
  | 'sign-out'
  | 'trash'
  | 'arrow-left'
  | 'play'
  | 'stop'
  | 'crown'
  | 'key'
  | 'puzzle'
  | 'gear';

const ICONS: Record<IconName, PhosphorIcon> = {
  'chevron-down': CaretDown,
  close: X,
  user: User,
  users: Users,
  book: Book,
  game: GameController,
  check: Check,
  lock: Lock,
  snowflake: Snowflake,
  info: Info,
  spinner: CircleNotch,
  'dots-three': DotsThree,
  envelope: EnvelopeSimple,
  'user-plus': UserPlus,
  plus: Plus,
  pencil: PencilSimple,
  'sign-out': SignOut,
  trash: Trash,
  'arrow-left': ArrowLeft,
  play: Play,
  stop: Stop,
  crown: Crown,
  key: Key,
  puzzle: PuzzlePiece,
  gear: Gear,
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
