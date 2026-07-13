'use client';

/*
creates button Delete Player and confirmation modal. states are:
- isOpen, controls confirmation modal
- isActive, derived from selectedPlayer, is null or not, used to enable/disable button
*/

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { playersApi } from '@/lib/api';
import { Player } from '../../types';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';

type Props = {
  selectedPlayer: Player | null;
  onDeleted: (playerId: number) => void;
};

export default function DeletePlayer({ selectedPlayer, onDeleted }: Props) {
  const t = useTranslations('players');
  const tCommon = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);

  const isActive = selectedPlayer !== null;

  const handleDelete = async () => {
    if (!selectedPlayer) return;
    try {
      await playersApi.remove(selectedPlayer.id);
      onDeleted(selectedPlayer.id);
      setIsOpen(false);
    } catch (error) {
      console.error('deletePlayer failed:', error);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        fullWidth
        className="clay-action-btn"
        onClick={() => isActive && setIsOpen(true)}
        disabled={!isActive}
      >
        {t('deletePlayer')}
      </Button>

      {selectedPlayer && (
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title={t('delete.title', { name: selectedPlayer.name })}
          confirmLabel={tCommon('delete')}
          confirmVariant="destructive"
          onConfirm={handleDelete}
        >
          <p>{t('delete.confirmMessage')}</p>
        </Dialog>
      )}
    </>
  );
}
