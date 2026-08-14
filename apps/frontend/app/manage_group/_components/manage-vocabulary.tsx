'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, Icon } from '../../components/ui';

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
      <Icon name="book" size={18} />
      {t('manageVocabulary')}
    </Button>
  );
}
