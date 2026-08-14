'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dropdown, DropdownItem, Icon, type IconName } from '../../components/ui';

export type RowMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
  icon?: IconName;
  destructive?: boolean;
  disabled?: boolean;
};

type Props = {
  labelledBy: string;
  items: RowMenuItem[];
};

export default function RowMenu({ labelledBy, items }: Props) {
  const t = useTranslations('group');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (items.length === 0) return null;

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t('rowOptions', { name: labelledBy })}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="shrink-0 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <Icon name="dots-three" size={20} />
      </button>

      {isOpen && (
        <Dropdown
          role="menu"
          className="absolute right-0 mt-1 flex flex-col min-w-[12rem] z-50"
        >
          {items.map((item) => {
            const isDestructive = item.destructive || item.id === 'delete';
            return (
              <DropdownItem
                key={item.id}
                role="menuitem"
                disabled={item.disabled}
                className={
                  isDestructive
                    ? 'clay-dropdown-item-destructive disabled:opacity-50 disabled:cursor-not-allowed'
                    : 'disabled:opacity-50 disabled:cursor-not-allowed'
                }
                onClick={() => {
                  if (item.disabled) return;
                  setIsOpen(false);
                  item.onSelect();
                }}
              >
                {item.icon ? <Icon name={item.icon} size={16} /> : null}
                {item.label}
              </DropdownItem>
            );
          })}
        </Dropdown>
      )}
    </div>
  );
}
