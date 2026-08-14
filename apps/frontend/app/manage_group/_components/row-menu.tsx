'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Dropdown, DropdownItem, Icon } from '../../components/ui';

export type RowMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
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
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t('rowOptions', { name: labelledBy })}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="px-2"
      >
        <Icon name="chevron-down" size={16} />
      </Button>

      {isOpen && (
        <Dropdown
          role="menu"
          className="absolute right-0 mt-1 flex flex-col min-w-[12rem] z-50"
        >
          {items.map((item) => (
            <DropdownItem
              key={item.id}
              role="menuitem"
              disabled={item.disabled}
              className={
                item.destructive
                  ? 'text-destructive disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'disabled:opacity-50 disabled:cursor-not-allowed'
              }
              onClick={() => {
                if (item.disabled) return;
                setIsOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </DropdownItem>
          ))}
        </Dropdown>
      )}
    </div>
  );
}
