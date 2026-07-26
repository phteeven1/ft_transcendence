'use client';

import { useTranslations } from 'next-intl';
import { Button } from '../../components/ui/button';

type Props = {
  onSkip: () => void;
};

export default function CorrectionPuzzle({ onSkip }: Props) {
  const t = useTranslations('games.puzzle');
  const tCommon = useTranslations('common');

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-lg font-semibold font-heading text-foreground">{t('correctionTitle')}</p>
      <p className="text-sm text-muted-foreground">{t('correctionSubtitle')}</p>
      <Button variant="ghost" size="sm" onClick={onSkip} className="mt-4">
        {tCommon('skip')}
      </Button>
    </div>
  );
}
