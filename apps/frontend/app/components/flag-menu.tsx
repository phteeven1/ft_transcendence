/* Flagmenu starts with English flag. If changed, it stores in local storage.
 * It uses React Context and localStorage to store language. 
 * import { useLanguage } from '/context/language-context.tsx' to access language.
 * layout.tsx is wrapped in LanguageProvider
*/

'use client'

import { useLanguage, LANGUAGES } from '../context/language-context';
import { useState } from 'react'
import Image from 'next/image'
import { Button, Dropdown, DropdownItem } from './ui';

export default function FlagMenu() {
  const { selected, setSelected } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <Image src={selected.flag} alt={selected.label} width={24} height={18} />
      </Button>

      {isOpen && (
        <Dropdown className="absolute right-0 mt-2 flex flex-col min-w-[8rem] z-50">
          {LANGUAGES.map((lang) => (
            <DropdownItem
              key={lang.code}
              onClick={() => { setSelected(lang); setIsOpen(false); }}
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
