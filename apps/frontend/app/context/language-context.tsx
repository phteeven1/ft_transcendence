'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE, type LocaleCode } from '@/i18n/config';
import { useAuth } from './auth-context';

export type Language = {
  code: LocaleCode;
  label: string;
  flag: string;
};

type LanguageContextType = {
  selected: Language;
  setSelected: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

const LEGACY_KEY = 'selectedLanguage';
const GUEST_KEY = 'selectedLanguage:guest';

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', flag: '/flags/gb.svg' },
  { code: 'de', label: 'Deutsch', flag: '/flags/de.svg' },
  { code: 'fr', label: 'Français', flag: '/flags/fr.svg' },
];

const DEFAULT_LANGUAGE = LANGUAGES[0];

const languagesByCode = Object.fromEntries(
  LANGUAGES.map((lang) => [lang.code, lang]),
) as Record<string, Language>;

function identityStorageKey(
  userId: number | null,
  playerId: number | null,
): string {
  if (playerId != null) return `selectedLanguage:player:${playerId}`;
  if (userId != null) return `selectedLanguage:user:${userId}`;
  return GUEST_KEY;
}

function parseStoredLanguage(raw: string | null): Language {
  if (!raw) return DEFAULT_LANGUAGE;
  try {
    const parsed = JSON.parse(raw) as Language;
    return languagesByCode[parsed.code] ?? DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function readLanguage(key: string): Language {
  const stored = localStorage.getItem(key);
  if (stored) return parseStoredLanguage(stored);
  return parseStoredLanguage(localStorage.getItem(LEGACY_KEY));
}

function writeCookie(code: LocaleCode): void {
  document.cookie = `${LOCALE_COOKIE}=${code};path=/;max-age=31536000;SameSite=Lax`;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, player } = useAuth();
  const storageKey = identityStorageKey(user?.id ?? null, player?.id ?? null);
  const [selected, setSelectedState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    setSelectedState(readLanguage(storageKey));
  }, [storageKey]);

  useEffect(() => {
    writeCookie(selected.code);
  }, [selected.code]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        setSelectedState(readLanguage(storageKey));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey]);

  const setSelected = (lang: Language) => {
    const normalized = languagesByCode[lang.code] ?? DEFAULT_LANGUAGE;
    localStorage.setItem(storageKey, JSON.stringify(normalized));
    writeCookie(normalized.code);
    setSelectedState(normalized);
  };

  return (
    <LanguageContext.Provider value={{ selected, setSelected }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function useSetLocale() {
  const { setSelected } = useLanguage();
  const router = useRouter();

  return useCallback(
    (lang: Language) => {
      setSelected(lang);
      router.refresh();
    },
    [setSelected, router],
  );
}
