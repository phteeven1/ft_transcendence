'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

type MenuCoords = {
  top: number;
  left: number;
};

const MENU_MIN_WIDTH_PX = 192;
const MENU_GAP_PX = 4;
const MENU_VIEWPORT_PADDING_PX = 8;

export default function RowMenu({ labelledBy, items }: Props) {
  const t = useTranslations('group');
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function close(): void {
    setIsOpen(false);
    setCoords(null);
  }

  useLayoutEffect(() => {
    if (!isOpen) return;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    let top = triggerRect.bottom + MENU_GAP_PX;
    const wouldOverflowBottom =
      top + menuRect.height > window.innerHeight - MENU_VIEWPORT_PADDING_PX;
    const fitsAbove =
      triggerRect.top - menuRect.height - MENU_GAP_PX >= MENU_VIEWPORT_PADDING_PX;
    if (wouldOverflowBottom && fitsAbove) {
      top = triggerRect.top - menuRect.height - MENU_GAP_PX;
    }

    let left = triggerRect.right - menuRect.width;
    left = Math.min(
      Math.max(MENU_VIEWPORT_PADDING_PX, left),
      window.innerWidth - menuRect.width - MENU_VIEWPORT_PADDING_PX,
    );
    setCoords({ top, left });
  }, [isOpen, items]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close();
    };
    const handleScroll = () => close();
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  if (items.length === 0) return null;

  const menu = isOpen
    ? createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: coords?.top ?? 0,
            left: coords?.left ?? 0,
            minWidth: MENU_MIN_WIDTH_PX,
            visibility: coords ? 'visible' : 'hidden',
            zIndex: 50,
          }}
        >
          <Dropdown role="menu" className="flex flex-col min-w-[12rem]">
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
                    close();
                    item.onSelect();
                  }}
                >
                  {item.icon ? <Icon name={item.icon} size={16} /> : null}
                  {item.label}
                </DropdownItem>
              );
            })}
          </Dropdown>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (isOpen) close();
          else setIsOpen(true);
        }}
        aria-label={t('rowOptions', { name: labelledBy })}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="shrink-0 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <Icon name="dots-three" size={20} />
      </button>
      {menu}
    </div>
  );
}
