'use client';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui';

export default function ManagePlayers() {
  const t = useTranslations('group');
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push('/manage_players')}
      variant="primary"
      fullWidth
      className="clay-action-btn"
    >
      {t('managePlayers')}
    </Button>
  );
}
