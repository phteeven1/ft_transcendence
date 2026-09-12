'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import WordBuildingPlaceholderClient from './_components/word-building-game';

/**
 * Loading shell shown while the crossword client initializes.
 */
function WordBuildingLoading() {
  const t = useTranslations('common');

  return (
    <div className="game-shell flex-1 flex items-center justify-center">
      <p className="text-muted-foreground">{t('loadingGame')}</p>
    </div>
  );
}

/**
 * Word Building page. Defers the client game until hydration finishes.
 */
export default function WordBuildingPage() {
  return (
    <Suspense fallback={<WordBuildingLoading />}>
      <WordBuildingPlaceholderClient />
    </Suspense>
  );
}
