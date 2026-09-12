import { ButtonHTMLAttributes, HTMLAttributes } from 'react';

export type DropdownProps = HTMLAttributes<HTMLDivElement>;

export function Dropdown({ className = '', children, ...props }: DropdownProps) {
  return (
    <div className={['clay-dropdown', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
}

export type DropdownItemProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function DropdownItem({ className = '', type = 'button', ...props }: DropdownItemProps) {
  return (
    <button
      type={type}
      className={['clay-dropdown-item w-full', className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
