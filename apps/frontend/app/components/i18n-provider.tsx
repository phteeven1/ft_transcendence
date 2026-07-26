'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';
import { useLanguage } from '../context/language-context';
import type { LocaleCode } from '@/i18n/config';

type Messages = Record<string, unknown>;

async function loadMessages(locale: LocaleCode): Promise<Messages> {
  return (await import(`../../messages/${locale}.json`)).default;
}

type I18nProviderProps = {
  children: ReactNode;
  initialLocale: LocaleCode;
  initialMessages: Messages;
};

export function I18nProvider({ children, initialLocale, initialMessages }: I18nProviderProps) {
  const { selected } = useLanguage();
  const locale = selected.code as LocaleCode;
  const serverSynced = locale === initialLocale;
  const [clientMessages, setClientMessages] = useState<Messages | null>(null);

  useEffect(() => {
    if (serverSynced) return;
    let cancelled = false;
    void loadMessages(locale).then((loaded) => {
      if (!cancelled) setClientMessages(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [locale, serverSynced]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const messages = serverSynced ? initialMessages : (clientMessages ?? initialMessages);

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Berlin">
      {children}
    </NextIntlClientProvider>
  );
}
