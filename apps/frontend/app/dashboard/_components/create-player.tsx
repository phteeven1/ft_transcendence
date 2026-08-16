'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { playersApi } from '@/lib/api';
import { Player } from '../../types';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (player: Player) => void;
};

export default function CreatePlayer({ open, onClose, onCreated }: Props) {
  const t = useTranslations('players');
  const tCommon = useTranslations('common');
  const { user, group } = useAuth();
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setPlayerName('');
    setError('');
    onClose();
  };

  const handleCreate = async () => {
    if (!user || !group) return;
    if (!playerName.trim()) {
      setError(t('create.allFieldsRequired'));
      return;
    }
    try {
      const created = await playersApi.create({
        playerInGroup: group.id,
        playerParent: user.id,
        playerName: playerName.trim(),
      });
      onCreated(created);
      handleClose();
    } catch {
      setError(t('create.failed'));
    }
  };

  const canCreate = playerName.trim() !== '';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('create.title')}
      confirmLabel={tCommon('create')}
      onConfirm={handleCreate}
      confirmDisabled={!canCreate}
    >
      <div className="space-y-4">
        <Input
          label={t('create.playerNameLabel')}
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder={t('create.playerNamePlaceholder')}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
}
