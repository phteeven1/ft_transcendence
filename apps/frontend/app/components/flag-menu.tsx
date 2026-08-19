'use client';

import { useLanguage, LANGUAGES, useSetLocale } from '../context/language-context';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button, Dropdown, DropdownItem } from './ui';

export default function FlagMenu() {
  const { selected } = useLanguage();
  const setLocale = useSetLocale();
  const t = useTranslations('nav');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('selectLanguage')}
        aria-expanded={isOpen}
      >
        <Image src={selected.flag} alt={selected.label} width={24} height={18} priority />
      </Button>

      {isOpen && (
        <Dropdown className="absolute right-0 mt-2 flex flex-col min-w-[8rem] z-50">
          {LANGUAGES.map((lang) => (
            <DropdownItem
              key={lang.code}
              onClick={() => {
                setLocale(lang);
                setIsOpen(false);
              }}
            >
              <Image src={lang.flag} alt={lang.label} width={24} height={18} />
              <span>{lang.label}</span>
            </DropdownItem>
          ))}
        </Dropdown>
      )}
    </div>
  );
}
