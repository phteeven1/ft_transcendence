import { HTMLAttributes } from 'react';

type CardVariant = 'default' | 'interactive' | 'feature';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantClass: Record<CardVariant, string> = {
  default: 'clay-card',
  interactive: 'clay-card clay-card-interactive cursor-pointer',
  feature: 'clay-card clay-card-feature',
};

export function Card({
  variant = 'default',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div className={[variantClass[variant], className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
}
