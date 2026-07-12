'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE, type LocaleCode } from '@/i18n/config';

export type Language = {
  code: LocaleCode;
  label: string;
  flag: string;
};

type LanguageContextType = {
  selected: Language;
  setSelected: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const STORAGE_KEY = 'selectedLanguage';
const CHANGE_EVENT = 'language-change';

export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', flag: '/flags/gb.svg' },
  { code: 'de', label: 'Deutsch', flag: '/flags/de.svg' },
  { code: 'fr', label: 'Français', flag: '/flags/fr.svg' },
];

const DEFAULT_LANGUAGE = LANGUAGES[0];

const languagesByCode = Object.fromEntries(
  LANGUAGES.map((lang) => [lang.code, lang]),
) as Record<string, Language>;

let cachedRaw: string | null | undefined;
let cachedSnapshot: Language = DEFAULT_LANGUAGE;

function parseStoredLanguage(raw: string | null): Language {
  if (!raw) return DEFAULT_LANGUAGE;
  try {
    const parsed = JSON.parse(raw) as Language;
    return languagesByCode[parsed.code] ?? DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function getSnapshot(): Language {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  cachedSnapshot = parseStoredLanguage(raw);
  return cachedSnapshot;
}

function getServerSnapshot(): Language {
  return DEFAULT_LANGUAGE;
}

function subscribe(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const selected = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    document.cookie = `${LOCALE_COOKIE}=${selected.code};path=/;max-age=31536000;SameSite=Lax`;
  }, [selected.code]);

  const setSelected = (lang: Language) => {
    const normalized = languagesByCode[lang.code] ?? DEFAULT_LANGUAGE;
    const raw = JSON.stringify(normalized);
    localStorage.setItem(STORAGE_KEY, raw);
    document.cookie = `${LOCALE_COOKIE}=${normalized.code};path=/;max-age=31536000;SameSite=Lax`;
    cachedRaw = raw;
    cachedSnapshot = normalized;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <LanguageContext.Provider value={{ selected, setSelected }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
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
