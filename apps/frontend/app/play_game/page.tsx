'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import PlayGameClient from './play-game-client';
import { PageShell } from '../components/ui/page-shell';

function PlayGameLoading() {
  const t = useTranslations('common');

  return (
    <PageShell centered narrow>
      <p className="text-muted-foreground">{t('loadingGame')}</p>
    </PageShell>
  );
}

export default function PlayGamePage() {
  return (
    <Suspense fallback={<PlayGameLoading />}>
      <PlayGameClient />
    </Suspense>
  );
}
