import type { ReactNode } from 'react';

export type GameOverlayShellProps = {
  children: ReactNode;
  className?: string;
  zIndexClass?: string;
  rounded?: boolean;
  role?: string;
  ariaModal?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  id?: string;
};

export function GameOverlayShell({
  children,
  className = '',
  zIndexClass = 'z-50',
  rounded = false,
  role,
  ariaModal,
  ariaLabel,
  ariaLabelledBy,
  id,
}: GameOverlayShellProps) {
  return (
    <div
      id={id}
      className={[
        'game-overlay-backdrop absolute inset-0 overflow-hidden bg-gradient-to-b from-teal-900/92 via-emerald-900/90 to-teal-950/95 backdrop-blur-md',
        zIndexClass,
        rounded ? 'rounded-2xl' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role={role}
      aria-modal={ariaModal}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      {children}
    </div>
  );
}
