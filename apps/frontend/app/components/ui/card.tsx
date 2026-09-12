import { HTMLAttributes } from 'react';

type CardVariant = 'default' | 'feature';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantClass: Record<CardVariant, string> = {
  default: 'clay-card',
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
