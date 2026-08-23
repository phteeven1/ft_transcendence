import type { LocaleCode } from '@/i18n/config';

const ENGLISH_ORDINAL_SUFFIX: Record<Intl.LDMLPluralRule, string> = {
  zero: 'th',
  one: 'st',
  two: 'nd',
  few: 'rd',
  many: 'th',
  other: 'th',
};

/** Rank label for game-over place announcements (e.g. en: "2nd", fr: "2e", de: "2"). */
export function formatPlaceOrdinal(place: number, locale: LocaleCode): string {
  if (locale === 'de') {
    return String(place);
  }

  if (locale === 'fr') {
    if (place === 1) return '1re';
    return `${place}e`;
  }

  const rule = new Intl.PluralRules('en', { type: 'ordinal' }).select(place);
  return `${place}${ENGLISH_ORDINAL_SUFFIX[rule]}`;
}
