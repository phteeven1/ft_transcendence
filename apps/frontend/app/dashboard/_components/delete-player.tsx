'use client';

import { useState } from 'react';
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
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!player) return;
    setError('');
    try {
      await playersApi.remove(player.id);
      onDeleted(player.id);
      onClose();
    } catch {
      setError(tCommon('somethingWentWrong'));
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
      {error && <p className="text-sm text-destructive mt-3">{error}</p>}
    </Dialog>
  );
}
