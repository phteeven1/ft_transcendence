import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, LOCALE_COOKIE, type LocaleCode } from './config';

function resolveLocale(raw: string | undefined): LocaleCode {
  if (raw && (locales as readonly string[]).includes(raw)) {
    return raw as LocaleCode;
  }
  return defaultLocale;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
