'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ReactNode } from 'react';
import { Card } from './ui/card';

type LegalDocumentProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalDocument({ title, lastUpdated, children }: LegalDocumentProps) {
  const t = useTranslations('legal');

  return (
    <div className="page-content">
      <Card className="legal-prose">
        <header className="mb-8 border-b border-border/50 pb-6">
          <p className="mb-2 text-sm font-heading font-semibold uppercase tracking-widest text-primary">
            {t('header')}
          </p>
          <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('lastUpdated', { date: lastUpdated })}</p>
        </header>
        {children}
        <footer className="mt-10 border-t border-border/50 pt-6 text-sm text-muted-foreground">
          <p>{t('footerQuestions')}</p>
          <p className="mt-3">
            {t('seeAlso')}{' '}
            <Link href="/privacy" className="legal-inline-link">
              {t('privacy.title')}
            </Link>{' '}
            ·{' '}
            <Link href="/terms" className="legal-inline-link">
              {t('terms.title')}
            </Link>
          </p>
        </footer>
      </Card>
    </div>
  );
}
