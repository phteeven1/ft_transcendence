'use client';

/*
renders button and one input field. Three states:
- isOpen, controls modal
- renameName, the new name
- isActive, derived from selectedPlayer !== null
*/

import { useState } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);
  const [renameName, setRenameName] = useState('');

  const isActive = selectedPlayer !== null;

  // guards against no selectedPlayer and empty input field
  // POSTs playerId and new playerName to backend
  // on success, calls onRenamed(updated) with full updated player from backend
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

  // Rename button is disabled until player is selected
  return (
    <>
      <Button
        variant="primary"
        fullWidth
        className="clay-action-btn"
        onClick={() => isActive && setIsOpen(true)}
        disabled={!isActive}
      >
        Rename Player
      </Button>

      {selectedPlayer && (
        <Dialog
          open={isOpen}
          onClose={handleClose}
          title={`Rename ${selectedPlayer.name}`}
          confirmLabel="Rename"
          onConfirm={handleRename}
          confirmDisabled={!renameName.trim()}
        >
          <Input
            type="text"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            placeholder="New name"
            autoComplete="new-password"
          />
        </Dialog>
      )}
    </>
  );
}
