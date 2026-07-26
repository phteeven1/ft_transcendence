'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { PageShell } from './components/ui/page-shell';

export default function Home() {
  const t = useTranslations('home');

  const features = [
    { titleKey: 'featureUploadTitle' as const, textKey: 'featureUploadText' as const },
    { titleKey: 'featureInviteTitle' as const, textKey: 'featureInviteText' as const },
    { titleKey: 'featurePlayTitle' as const, textKey: 'featurePlayText' as const },
  ];

  return (
    <PageShell centered>
      <Card variant="feature" className="text-center max-w-2xl mx-auto">
        <p className="text-sm font-heading font-semibold uppercase tracking-widest text-primary mb-2">
          {t('tagline')}
        </p>
        <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground mb-4">
          {t('title')}
        </h1>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          {t('description')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button variant="accent" size="lg">
              {t('getStarted')}
            </Button>
          </Link>
          <Link href="/signin">
            <Button variant="secondary" size="lg">
              {t('signIn')}
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 max-w-3xl mx-auto w-full">
        {features.map((item) => (
          <Card key={item.titleKey} className="text-center">
            <h2 className="font-heading text-lg font-bold text-primary mb-2">{t(item.titleKey)}</h2>
            <p className="text-sm text-muted-foreground">{t(item.textKey)}</p>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
