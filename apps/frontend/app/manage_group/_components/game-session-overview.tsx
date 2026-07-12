'use client';

import { useTranslations } from 'next-intl';

export default function GameSessionOverview() {
  const t = useTranslations('group');

  return (
    <div className="text-sm text-muted-foreground italic p-2">
      {t('gameSessionOverviewComingSoon')}
    </div>
  );
}
