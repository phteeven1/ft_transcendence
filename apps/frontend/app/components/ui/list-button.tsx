import { ButtonHTMLAttributes } from 'react';

export interface ListButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function ListButton({ active = false, className = '', type = 'button', ...props }: ListButtonProps) {
  return (
    <button
      type={type}
      className={[
        'clay-list-btn rounded-lg',
        active ? 'clay-list-btn-active' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
