'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

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

const DEFAULT_LANGUAGE: Language = {
  code: 'en',
  label: 'English',
  flag: '/flags/gb.svg',
};

function readSavedLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  const saved = localStorage.getItem('selectedLanguage');
  if (!saved) return DEFAULT_LANGUAGE;
  try {
    return JSON.parse(saved) as Language;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Language>(readSavedLanguage);

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