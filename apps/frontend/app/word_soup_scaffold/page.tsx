'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import WordSoupGame from './_components/word-soup-game';

function WordSoupLoading() {
  const t = useTranslations('common');

  return (
    <div className="game-shell flex-1 flex items-center justify-center">
      <p className="text-muted-foreground">{t('loadingGame')}</p>
    </div>
  );
}

export default function WordSoupPage() {
  return (
    <Suspense fallback={<WordSoupLoading />}>
      <WordSoupGame />
    </Suspense>
  );
}
