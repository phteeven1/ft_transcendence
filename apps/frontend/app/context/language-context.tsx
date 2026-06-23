'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = {
  code: string;
  label: string;
  flag: string;
};

type LanguageContextType = {
  selected: Language;
  setSelected: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Language>({
    code: 'en',
    label: 'English',
    flag: '/flags/gb.svg',
  });

  // Load saved language from localStorage on initial render
  useEffect(() => {
    const saved = localStorage.getItem('selectedLanguage');
    if (saved) setSelected(JSON.parse(saved));
  }, []);

  // Update localStorage whenever the language changes
  const handleSetSelected = (lang: Language) => {
    setSelected(lang);
    localStorage.setItem('selectedLanguage', JSON.stringify(lang));
  };

  return (
    <LanguageContext.Provider value={{ selected, setSelected: handleSetSelected }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}