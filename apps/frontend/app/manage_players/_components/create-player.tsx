'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { playersApi } from '@/lib/api';
import { Player } from '../../types';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Icon } from '../../components/ui';

type Props = {
  onCreated: (player: Player) => void;
  compact?: boolean;
};

export default function CreatePlayer({ onCreated, compact = false }: Props) {
  const t = useTranslations('players');
  const tCommon = useTranslations('common');
  const { user, group } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [passQuestion, setPassQuestion] = useState('');
  const [passAnswer, setPassAnswer] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!user || !group) return;
    if (!playerName.trim() || !passQuestion.trim() || !passAnswer.trim()) {
      setError(t('create.allFieldsRequired'));
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
      setError(t('create.failed'));
    }
  };

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

  return (
    <>
      <Button
        variant="primary"
        size={compact ? 'sm' : 'md'}
        fullWidth={!compact}
        className={compact ? '' : 'clay-action-btn'}
        onClick={() => setIsOpen(true)}
      >
        <Icon name="user-plus" size={compact ? 16 : 18} />
        {t('createPlayer')}
      </Button>

      <Dialog
        open={isOpen}
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
          <Input
            label={t('create.secretQuestionLabel')}
            type="text"
            value={passQuestion}
            onChange={(e) => setPassQuestion(e.target.value)}
            placeholder={t('create.secretQuestionPlaceholder')}
            autoComplete="new-password"
          />
          <Input
            label={t('create.answerLabel')}
            type="text"
            value={passAnswer}
            onChange={(e) => setPassAnswer(e.target.value)}
            placeholder={t('create.answerPlaceholder')}
            autoComplete="new-password"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </Dialog>
    </>
  );
}
