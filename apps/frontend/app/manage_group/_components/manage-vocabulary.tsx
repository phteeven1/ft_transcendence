'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui';

export default function ManageVocabulary() {
  const t = useTranslations('group');
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push('/manage_vocabulary')}
      variant="accent"
      fullWidth
      className="clay-action-btn"
    >
      {t('manageVocabulary')}
    </Button>
  );
}
