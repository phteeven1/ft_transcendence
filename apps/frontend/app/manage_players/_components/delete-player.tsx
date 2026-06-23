'use client';

/*
creates button Delete Player and confirmation modal. states are:
- isOpen, controls confirmation modal
- isActive, derived from selectedPlayer, is null or not, used to enable/disable button
*/

import { useState } from 'react';
import { playersApi } from '@/lib/api';
import { Player } from '../../types';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';

type Props = {
  selectedPlayer: Player | null;
  onDeleted: (playerId: number) => void;
};

export default function DeletePlayer({ selectedPlayer, onDeleted }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const isActive = selectedPlayer !== null;

  // guards against no selectedPlayer, POSTs to backend with just player id
  // on success, calls onDeleted(selectedPlayer.playerId) to remove player from parent's list
  // on failure, logs error
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

  // renders button and confirmation modal
  return (
    <>
      <Button
        variant="destructive"
        fullWidth
        className="clay-action-btn"
        onClick={() => isActive && setIsOpen(true)}
        disabled={!isActive}
      >
        Delete Player
      </Button>

      {selectedPlayer && (
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title={`Delete ${selectedPlayer.name}?`}
          confirmLabel="Delete"
          confirmVariant="destructive"
          onConfirm={handleDelete}
        >
          <p>
            This will permanently delete this player profile. This cannot be
            undone.
          </p>
        </Dialog>
      )}
    </>
  );
}
