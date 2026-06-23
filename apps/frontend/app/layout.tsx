import type { Metadata } from 'next';
import { Baloo_2, Comic_Neue } from 'next/font/google';
import './globals.css';
import TopBar from './components/top-bar';
import SiteFooter from './components/site-footer';
import { LanguageProvider } from './context/language-context';
import { AuthProvider } from './context/auth-context';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${baloo2.variable} ${comicNeue.variable} flex min-h-screen flex-col antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          <LanguageProvider>
            <TopBar />
            <main className="flex flex-1 flex-col">{children}</main>
            <SiteFooter />
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
