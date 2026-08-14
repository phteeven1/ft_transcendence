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
  onUpdated: (player: Player) => void;
};

export default function EditPassphrase(props: Props) {
  if (!props.player) return null;
  return <EditPassphraseDialog {...props} player={props.player} />;
}

function EditPassphraseDialog({
  player,
  open,
  onClose,
  onUpdated,
}: Props & { player: Player }) {
  const t = useTranslations('players');
  const tCommon = useTranslations('common');
  const [passQuestion, setPassQuestion] = useState(player.passQuestion);
  const [passAnswer, setPassAnswer] = useState('');

  const handleClose = () => {
    setPassQuestion(player.passQuestion);
    setPassAnswer('');
    onClose();
  };

  const handleSave = async () => {
    if (!passQuestion.trim() || !passAnswer.trim()) return;
    try {
      const updated = await playersApi.updatePassPhrase({
        playerId: player.id,
        playerPassQuestion: passQuestion.trim(),
        playerPassAnswer: passAnswer.trim(),
      });
      onUpdated(updated);
      handleClose();
    } catch (error) {
      console.error('editPassPhrase failed:', error);
    }
  };

  const canSave = passQuestion.trim() !== '' && passAnswer.trim() !== '';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('editPassphrase.title', { name: player.name })}
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
  );
}
