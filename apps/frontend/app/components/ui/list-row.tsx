'use client';

import { ReactNode } from 'react';

export interface ListRowProps {
  active?: boolean;
  onSelect?: () => void;
  menu?: ReactNode;
  hoverContent?: ReactNode;
  children: ReactNode;
}

export function ListRow({
  active = false,
  onSelect,
  menu,
  hoverContent,
  children,
}: ListRowProps): ReactNode {
  const body = hoverContent ? (
    <>
      <span className="clay-list-row-default">{children}</span>
      <span className="clay-list-row-hover">{hoverContent}</span>
    </>
  ) : (
    children
  );

  return (
    <li
      className={[
        'clay-list-row',
        hoverContent ? 'group' : '',
        active ? 'clay-list-row-active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {onSelect ? (
        <button type="button" onClick={onSelect} className="clay-list-row-body">
          {body}
        </button>
      ) : (
        <div className="clay-list-row-static">{body}</div>
      )}
      {menu}
    </li>
  );
}
