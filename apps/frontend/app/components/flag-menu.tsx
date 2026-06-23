/* Flagmenu starts with English flag. If changed, it stores in local storage.
 * It uses React Context and localStorage to store language. 
 * import { useLanguage } from '/context/language-context.tsx' to access language.
 * layout.tsx is wrapped in LanguageProvider
*/

'use client'

import { useLanguage } from '../context/language-context';
import { useState } from 'react'
import Image from 'next/image'

const languages = [
    { code: 'en', label: 'English', flag: '/flags/gb.svg' },
    { code: 'de', label: 'Deutsch', flag: '/flags/de.svg' },
    { code: 'fr', label: 'Français', flag: '/flags/fr.svg' },
]

export default function FlagMenu() {
  const { selected, setSelected } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        <Image src={selected.flag} alt={selected.label} width={24} height={18} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 flex flex-col bg-white shadow-md rounded w-30">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { setSelected(lang); setIsOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100"
            >
              <Image src={lang.flag} alt={lang.label} width={24} height={18} />
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}