'use client';

import { useTranslations } from 'next-intl';
import { playersApi } from '@/lib/api';
import { Player } from '../../types';
import { Dialog } from '../../components/ui/dialog';

type Props = {
  player: Player | null;
  open: boolean;
  onClose: () => void;
  onDeleted: (playerId: number) => void;
};

export default function DeletePlayer({
  player,
  open,
  onClose,
  onDeleted,
}: Props) {
  const t = useTranslations('players');
  const tCommon = useTranslations('common');

  const handleDelete = async () => {
    if (!player) return;
    try {
      await playersApi.remove(player.id);
      onDeleted(player.id);
      onClose();
    } catch (error) {
      console.error('deletePlayer failed:', error);
    }
  };

  if (!player) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('delete.title', { name: player.name })}
      confirmLabel={tCommon('delete')}
      confirmVariant="destructive"
      onConfirm={handleDelete}
    >
      <p>{t('delete.confirmMessage')}</p>
    </Dialog>
  );
}
