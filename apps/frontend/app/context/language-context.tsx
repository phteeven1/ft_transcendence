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

const languageListeners = new Set<() => void>();
const languageSnapshots = new Map<string, Language>();

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

function getCachedLanguage(key: string): Language {
  const language = readLanguage(key);
  const cached = languageSnapshots.get(key);
  if (cached && cached.code === language.code) return cached;
  languageSnapshots.set(key, language);
  return language;
}

function subscribeLanguage(onStoreChange: () => void): () => void {
  languageListeners.add(onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === LEGACY_KEY ||
      event.key.startsWith('selectedLanguage')
    ) {
      onStoreChange();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    languageListeners.delete(onStoreChange);
    window.removeEventListener('storage', onStorage);
  };
}

function notifyLanguageListeners(): void {
  languageListeners.forEach((listener) => listener());
}

function writeCookie(code: LocaleCode): void {
  document.cookie = `${LOCALE_COOKIE}=${code};path=/;max-age=31536000;SameSite=Lax`;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, player } = useAuth();
  const storageKey = identityStorageKey(user?.id ?? null, player?.id ?? null);
  const selected = useSyncExternalStore(
    subscribeLanguage,
    () => getCachedLanguage(storageKey),
    () => DEFAULT_LANGUAGE,
  );

  useEffect(() => {
    writeCookie(selected.code);
  }, [selected.code]);

  const setSelected = (lang: Language) => {
    const normalized = languagesByCode[lang.code] ?? DEFAULT_LANGUAGE;
    localStorage.setItem(storageKey, JSON.stringify(normalized));
    writeCookie(normalized.code);
    languageSnapshots.set(storageKey, normalized);
    notifyLanguageListeners();
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
