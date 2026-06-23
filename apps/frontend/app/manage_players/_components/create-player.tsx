'use client';

/*
opens modal form, using the following states:
- isOpen controls whether the modal is visible
- playerName, passQuestion, passAnswer, controlled inputs, one per field
- error, holds validation or server error to display
*/

import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { playersApi } from '@/lib/api';
import { Player } from '../../types';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

type Props = {
  onCreated: (player: Player) => void;
};

export default function CreatePlayer({ onCreated }: Props) {
  const { user, group } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [passQuestion, setPassQuestion] = useState('');
  const [passAnswer, setPassAnswer] = useState('');
  const [error, setError] = useState('');

  // guards against no user or group, then validates that all three form fields are non-empty
  // POSTs to backend with player data, on success calls onCreated(created) to add new player to the parent's list
  // then calls handleClose. On failure, sets error message
  const handleCreate = async () => {
    if (!user || !group) return;
    if (!playerName.trim() || !passQuestion.trim() || !passAnswer.trim()) {
      setError('All fields are required.');
      return;
    }
    try {
      const created = await playersApi.create({
        playerInGroup: group.id,
        playerParent: user.id,
        playerName: playerName.trim(),
        playerPassQuestion: passQuestion.trim(),
        playerPassAnswer: passAnswer.trim(),
      });
      onCreated(created);
      handleClose();
    } catch (error) {
      console.error('createPlayer failed:', error);
      setError('Failed to create player. Please try again.');
    }
  };

  // resets all state back to empty and closes modal. Ensures that next time form
  // is opened, it is not pre filled with old data
  const handleClose = () => {
    setIsOpen(false);
    setPlayerName('');
    setPassQuestion('');
    setPassAnswer('');
    setError('');
  };

  const canCreate =
    playerName.trim() !== '' &&
    passQuestion.trim() !== '' &&
    passAnswer.trim() !== '';

  // renders two things. CreatePlayer button is always visible. modal is only rendered when isOpen === true
  return (
    <>
      <Button
        variant="primary"
        fullWidth
        className="clay-action-btn"
        onClick={() => setIsOpen(true)}
      >
        Create Player
      </Button>

      <Dialog
        open={isOpen}
        onClose={handleClose}
        title="Create Player Profile"
        confirmLabel="Create"
        onConfirm={handleCreate}
        confirmDisabled={!canCreate}
      >
        <div className="space-y-4">
          <Input
            label="Player Name"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g. Adam"
            autoComplete="new-password"
          />
          <Input
            label="Secret Question"
            type="text"
            value={passQuestion}
            onChange={(e) => setPassQuestion(e.target.value)}
            placeholder="e.g. What is your dog's name?"
            autoComplete="new-password"
          />
          <Input
            label="Answer"
            type="text"
            value={passAnswer}
            onChange={(e) => setPassAnswer(e.target.value)}
            placeholder="e.g. Rex"
            autoComplete="new-password"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </Dialog>
    </>
  );
}
