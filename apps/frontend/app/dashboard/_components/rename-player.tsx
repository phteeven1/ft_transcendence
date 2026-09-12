'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { playersApi } from '@/lib/api';
import { Player } from '../../types';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

type Props = {
  player: Player | null;
  open: boolean;
  onClose: () => void;
  onRenamed: (player: Player) => void;
};

export default function RenamePlayer({
  player,
  open,
  onClose,
  onRenamed,
}: Props) {
  const t = useTranslations('players');
  const tCommon = useTranslations('common');
  const [renameName, setRenameName] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setRenameName('');
    setError('');
    onClose();
  };

  const handleRename = async () => {
    if (!player || !renameName.trim()) return;
    try {
      const updated = await playersApi.rename({
        playerId: player.id,
        playerName: renameName.trim(),
      });
      onRenamed(updated);
      handleClose();
    } catch {
      setError(tCommon('somethingWentWrong'));
    }
  };

  if (!player) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('rename.title', { name: player.name })}
      confirmLabel={tCommon('rename')}
      onConfirm={handleRename}
      confirmDisabled={!renameName.trim()}
    >
      <Input
        label={t('rename.placeholder')}
        type="text"
        value={renameName}
        onChange={(e) => setRenameName(e.target.value)}
        placeholder={t('rename.placeholder')}
        autoComplete="off"
      />
      {error && <p className="text-sm text-destructive mt-3">{error}</p>}
    </Dialog>
  );
}
