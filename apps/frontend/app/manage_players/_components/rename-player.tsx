'use client';

/*
renders button and one input field. Three states:
- isOpen, controls modal
- renameName, the new name
- isActive, derived from selectedPlayer !== null
*/

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { playersApi } from '@/lib/api';
import { Player } from '../../types';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

type Props = {
  selectedPlayer: Player | null;
  onRenamed: (player: Player) => void;
};

export default function RenamePlayer({ selectedPlayer, onRenamed }: Props) {
  const t = useTranslations('players');
  const tCommon = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [renameName, setRenameName] = useState('');

  const isActive = selectedPlayer !== null;

  const handleRename = async () => {
    if (!selectedPlayer || !renameName.trim()) return;
    try {
      const updated = await playersApi.rename({
        playerId: selectedPlayer.id,
        playerName: renameName.trim(),
      });
      onRenamed(updated);
      setIsOpen(false);
      setRenameName('');
    } catch (error) {
      console.error('renamePlayer failed:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setRenameName('');
  };

  return (
    <>
      <Button
        variant="primary"
        fullWidth
        className="clay-action-btn"
        onClick={() => isActive && setIsOpen(true)}
        disabled={!isActive}
      >
        {t('renamePlayer')}
      </Button>

      {selectedPlayer && (
        <Dialog
          open={isOpen}
          onClose={handleClose}
          title={t('rename.title', { name: selectedPlayer.name })}
          confirmLabel={tCommon('rename')}
          onConfirm={handleRename}
          confirmDisabled={!renameName.trim()}
        >
          <Input
            type="text"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder={t('rename.placeholder')}
            autoComplete="new-password"
          />
        </Dialog>
      )}
    </>
  );
}
