'use client';

/*
renders button 'Edit PassPhrase' button and modal for new phrase and answer.
the phrase is prefilled on opening, but not the answer. States are:
- isOpen, controls modal
- passQuestion, passAnswer, controlled inputs
- isActive, is derived from selectedPlayer !== null
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
  onUpdated: (player: Player) => void;
};

export default function EditPassphrase({ selectedPlayer, onUpdated }: Props) {
  const t = useTranslations('players');
  const tCommon = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [passQuestion, setPassQuestion] = useState('');
  const [passAnswer, setPassAnswer] = useState('');

  const isActive = selectedPlayer !== null;

  const handleOpen = () => {
    if (!selectedPlayer) return;
    setPassQuestion(selectedPlayer.passQuestion);
    setPassAnswer('');
    setIsOpen(true);
  };

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

  return (
    <>
      <Button
        variant="primary"
        fullWidth
        className="clay-action-btn"
        onClick={handleOpen}
        disabled={!isActive}
      >
        {t('editPassphraseButton')}
      </Button>

      {selectedPlayer && (
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title={t('editPassphrase.title', { name: selectedPlayer.name })}
          confirmLabel={tCommon('save')}
          onConfirm={handleSave}
          confirmDisabled={!canSave}
        >
          <div className="space-y-4">
            <Input
              label={t('editPassphrase.secretQuestionLabel')}
              type="text"
              value={passQuestion}
              onChange={(e) => setPassQuestion(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              label={t('editPassphrase.answerLabel')}
              type="text"
              value={passAnswer}
              onChange={(e) => setPassAnswer(e.target.value)}
              placeholder={t('editPassphrase.answerPlaceholder')}
              autoComplete="new-password"
            />
          </div>
        </Dialog>
      )}
    </>
  );
}
