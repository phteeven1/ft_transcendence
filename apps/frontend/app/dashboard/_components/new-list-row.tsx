'use client';

import { ReactNode } from 'react';
import { Icon } from '../../components/ui';
import ListRow from './list-row';

type Props = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
};

export default function NewListRow({
  label,
  onSelect,
  disabled = false,
}: Props): ReactNode {
  return (
    <ListRow onSelect={disabled ? undefined : onSelect}>
      <span
        className={`flex items-center gap-2 ${
          disabled
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-muted-foreground'
        }`}
      >
        <Icon name="plus" size={16} />
        {label}
      </span>
    </ListRow>
  );
}
