'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function SiteFooter() {
  const t = useTranslations('nav');
  const year = new Date().getFullYear();

  return (
    <footer className="clay-footer mt-auto border-t border-border/60 px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
        <p className="font-heading text-center sm:text-left">
          {t('footerTagline', { year })}
        </p>
        <nav aria-label={t('legalNav')} className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/privacy" className="legal-footer-link">
            {t('privacyPolicy')}
          </Link>
          <span aria-hidden className="text-border">
            ·
          </span>
          <Link href="/terms" className="legal-footer-link">
            {t('termsOfService')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
