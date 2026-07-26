export const locales = ['en', 'de', 'fr'] as const;
export type LocaleCode = (typeof locales)[number];
export const defaultLocale: LocaleCode = 'en';

export const LOCALE_COOKIE = 'NEXT_LOCALE';
