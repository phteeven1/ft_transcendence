'use client';

import { ReactNode } from 'react';

type Props = {
  active?: boolean;
  onSelect?: () => void;
  menu?: ReactNode;
  hoverContent?: ReactNode;
  children: ReactNode;
};

export default function ListRow({
  active = false,
  onSelect,
  menu,
  hoverContent,
  children,
}: Props): ReactNode {
  const body = hoverContent ? (
    <>
      <span className="group-hover:hidden">{children}</span>
      <span className="hidden group-hover:flex items-center gap-2 text-foreground">
        {hoverContent}
      </span>
    </>
  ) : (
    children
  );

  return (
    <li
      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
        hoverContent ? 'group' : ''
      } ${active ? 'bg-muted/50' : 'hover:bg-muted/50'}`}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 text-left cursor-pointer"
        >
          {body}
        </button>
      ) : (
        <div className="min-w-0 flex-1">{body}</div>
      )}
      {menu}
    </li>
  );
}
