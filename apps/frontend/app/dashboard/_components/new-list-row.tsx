'use client';

import { ReactNode } from 'react';
import { Icon } from '../../components/ui';
import ListRow from './list-row';

type Props = {
  label: string;
  onSelect: () => void;
};

export default function NewListRow({ label, onSelect }: Props): ReactNode {
  return (
    <ListRow onSelect={onSelect}>
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon name="plus" size={16} />
        {label}
      </span>
    </ListRow>
  );
}
