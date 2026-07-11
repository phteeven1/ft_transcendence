import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'clay-btn clay-btn-primary',
  secondary: 'clay-btn clay-btn-secondary',
  accent: 'clay-btn clay-btn-accent',
  ghost: 'clay-btn clay-btn-ghost',
  destructive: 'clay-btn clay-btn-destructive',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'clay-btn-sm',
  md: 'clay-btn-md',
  lg: 'clay-btn-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      className = '',
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={[
        variantClass[variant],
        sizeClass[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  ),
);

Button.displayName = 'Button';
