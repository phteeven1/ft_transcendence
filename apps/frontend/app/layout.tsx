import type { Metadata } from 'next';
import { Baloo_2, Comic_Neue } from 'next/font/google';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';
import TopBar from './components/top-bar';
import SiteFooter from './components/site-footer';
import { LanguageProvider } from './context/language-context';
import { AuthProvider } from './context/auth-context';
import { I18nProvider } from './components/i18n-provider';
import type { LocaleCode } from '@/i18n/config';

const baloo2 = Baloo_2({
  variable: '--font-baloo',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const comicNeue = Comic_Neue({
  variable: '--font-comic',
  subsets: ['latin'],
  weight: ['300', '400', '700'],
});

export const metadata: Metadata = {
  title: 'Dicteé',
  description: 'Turn vocabulary lists into fun learning games for kids',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${baloo2.variable} ${comicNeue.variable} flex min-h-screen flex-col antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          <LanguageProvider>
            <I18nProvider initialLocale={locale as LocaleCode} initialMessages={messages}>
              <TopBar />
              <main className="flex flex-1 flex-col">{children}</main>
              <SiteFooter />
            </I18nProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
