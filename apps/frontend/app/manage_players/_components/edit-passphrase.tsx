'use client';

/*
renders button 'Edit PassPhrase' button and modal for new phrase and answer.
the phrase is prefilled on opening, but not the answer. States are:
- isOpen, controls modal
- passQuestion, passAnswer, controlled inputs
- isActive, is derived from selectedPlayer !== null
*/

import { useState } from 'react';
import { playersApi } from '@/lib/api';
import { Player } from '../../types';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

type Props = {
  selectedPlayer: Player | null;
  onUpdated: (player: Player) => void;
};

export default function EditPassphrase({ selectedPlayer, onUpdated }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [passQuestion, setPassQuestion] = useState('');
  const [passAnswer, setPassAnswer] = useState('');

  const isActive = selectedPlayer !== null;

  // prefills passQuestion but clears passAnswer, then sets modal to open
  const handleOpen = () => {
    if (!selectedPlayer) return;
    setPassQuestion(selectedPlayer.passQuestion);
    setPassAnswer('');
    setIsOpen(true);
  };

  // guards against no player, and empty fields. POSTs both question and answer to backend
  // on success, calls onUpdated(updated) with full updated player returned from backend,
  // then resets and closes
  const handleSave = async () => {
    if (!selectedPlayer || !passQuestion.trim() || !passAnswer.trim()) return;
    try {
      const updated = await playersApi.updatePassPhrase({
        playerId: selectedPlayer.id,
        playerPassQuestion: passQuestion.trim(),
        playerPassAnswer: passAnswer.trim(),
      });
      onUpdated(updated);
      setIsOpen(false);
      setPassQuestion('');
      setPassAnswer('');
    } catch (error) {
      console.error('editPassPhrase failed:', error);
    }
  };

  const canSave = passQuestion.trim() !== '' && passAnswer.trim() !== '';

  // buttons have both active and inactive states. 'Cancel' doesn't reset fields, just closes modal
  return (
    <>
      <Button
        variant="primary"
        fullWidth
        className="clay-action-btn"
        onClick={handleOpen}
        disabled={!isActive}
      >
        Edit PassPhrase
      </Button>

      {selectedPlayer && (
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title={`Edit PassPhrase for ${selectedPlayer.name}`}
          confirmLabel="Save"
          onConfirm={handleSave}
          confirmDisabled={!canSave}
        >
          <div className="space-y-4">
            <Input
              label="Secret Question"
              type="text"
              value={passQuestion}
              onChange={(e) => setPassQuestion(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              label="Answer"
              type="text"
              value={passAnswer}
              onChange={(e) => setPassAnswer(e.target.value)}
              placeholder="New answer"
              autoComplete="new-password"
            />
          </div>
        </Dialog>
      )}
    </>
  );
}
