'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';
import { useAuth } from '../../context/auth-context';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

type Props = {
  vocabulary: Vocabulary | null;
  open: boolean;
  onClose: () => void;
  onRenamed: (vocabulary: Vocabulary) => void;
};

export default function RenameVocabulary({
  vocabulary,
  open,
  onClose,
  onRenamed,
}: Props) {
  const t = useTranslations('vocabulary');
  const tCommon = useTranslations('common');
  const [newName, setNewName] = useState('');
  const { group } = useAuth();

  useEffect(() => {
    if (open && vocabulary) setNewName(vocabulary.name);
  }, [open, vocabulary]);

  const handleClose = () => {
    setNewName('');
    onClose();
  };

  const handleRename = async () => {
    if (!vocabulary || !newName.trim() || !group) return;
    try {
      const updated = await vocabulariesApi.rename({
        vocabularyId: vocabulary.id,
        vocabularyName: newName.trim(),
        vocabularyInGroup: group.id,
      });
      if (!updated) throw new Error('Failed to rename vocabulary');
      onRenamed(updated);
      handleClose();
    } catch (error) {
      console.error('renameVocabulary failed:', error);
    }
  };

  if (!vocabulary) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('rename.title', { name: vocabulary.name })}
      confirmLabel={tCommon('rename')}
      onConfirm={handleRename}
      confirmDisabled={!newName.trim()}
    >
      <Input
        type="text"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        placeholder={t('rename.placeholder')}
        autoComplete="off"
      />
    </Dialog>
  );
}
