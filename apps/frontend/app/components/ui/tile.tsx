import { Button, ButtonProps } from './button';

type TileVariant = 'default' | 'admin' | 'member' | 'create';

export interface TileProps extends ButtonProps {
  tileVariant?: TileVariant;
}

const tileVariantClass: Record<TileVariant, string> = {
  default: '',
  admin: 'clay-tile-admin',
  member: 'clay-tile-member',
  create: 'clay-tile-create',
};

const buttonVariantForTile: Record<TileVariant, ButtonProps['variant']> = {
  default: 'secondary',
  admin: 'primary',
  member: 'secondary',
  create: 'accent',
};

/** Dashboard / lobby tile button with Claymorphism styling. */
export function Tile({
  tileVariant = 'default',
  variant,
  size = 'lg',
  fullWidth = true,
  className = '',
  ...props
}: TileProps) {
  return (
    <Button
      variant={variant ?? buttonVariantForTile[tileVariant]}
      size={size}
      fullWidth={fullWidth}
      className={[
        'clay-tile min-h-[5rem]',
        tileVariantClass[tileVariant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  );
}
