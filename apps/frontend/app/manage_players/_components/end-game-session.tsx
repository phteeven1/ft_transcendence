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
  onCleared: (updated: Player) => void;
};

export default function EndGameSession({
  player,
  open,
  onClose,
  onCleared,
}: Props) {
  const t = useTranslations('players');
  const tCommon = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!player) return;
    setIsLoading(true);
    setError('');
    try {
      await playersApi.clearSession(player.id);
      const updated = await playersApi.getById(player.id);
      onClose();
      onCleared(updated);
    } catch {
      setError(t('endSession.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!player) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('endSession.title')}
      confirmLabel={
        isLoading ? tCommon('ending') : t('endSession.endSessionButton')
      }
      confirmVariant="destructive"
      onConfirm={handleConfirm}
      confirmDisabled={isLoading}
    >
      <p className="text-sm">
        {t('endSession.confirmMessage', { name: player.name })}
      </p>
      {error && <p className="text-destructive text-sm mt-2">{error}</p>}
    </Dialog>
  );
}
