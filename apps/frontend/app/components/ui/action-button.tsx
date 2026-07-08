import { Button, ButtonProps } from './button';

export type ActionButtonProps = ButtonProps;

/** Full-width grid action button used on manage screens. */
export function ActionButton({ className = '', size = 'md', fullWidth = true, ...props }: ActionButtonProps) {
  return (
    <Button
      size={size}
      fullWidth={fullWidth}
      className={['clay-action-btn', className].filter(Boolean).join(' ')}
      {...props}
    />
  );
}
