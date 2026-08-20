'use client';

import { ReactNode } from 'react';
import { Icon } from './ui-icon';
import { ListRow } from './list-row';

export interface NewListRowProps {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export function NewListRow({
  label,
  onSelect,
  disabled = false,
}: NewListRowProps): ReactNode {
  return (
    <ListRow onSelect={disabled ? undefined : onSelect}>
      <span
        className={[
          'clay-list-row-new',
          disabled ? 'clay-list-row-new-disabled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Icon name="plus" size={16} />
        {label}
      </span>
    </ListRow>
  );
}
