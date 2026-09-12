import { ButtonHTMLAttributes } from 'react';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({ active = true, className = '', type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      className={[
        'clay-chip',
        active ? '' : 'clay-chip-inactive',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
