'use client';
import { useTranslations } from 'next-intl';
import { Button } from '../../components/ui/button';

export default function ShareVocabulary() {
  const t = useTranslations('vocabulary');

  return (
    <Button
      variant="ghost"
      fullWidth
      className="clay-action-btn"
      disabled
    >
      {t('shareVocabulary')}
    </Button>
  );
}
