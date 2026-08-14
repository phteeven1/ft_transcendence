'use client';

import { ReactNode } from 'react';

type Props = {
  active?: boolean;
  onSelect?: () => void;
  menu?: ReactNode;
  children: ReactNode;
};

export default function ListRow({
  active = false,
  onSelect,
  menu,
  children,
}: Props): ReactNode {
  return (
    <li
      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
        active ? 'bg-muted/50' : 'hover:bg-muted/50'
      }`}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 text-left cursor-pointer"
        >
          {children}
        </button>
      ) : (
        <div className="min-w-0 flex-1">{children}</div>
      )}
      {menu}
    </li>
  );
}
