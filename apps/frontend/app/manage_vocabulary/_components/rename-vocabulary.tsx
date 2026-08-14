'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Icon } from '../../components/ui';

type Props = {
  selectedVocabulary: Vocabulary | null;
  onRenamed: (vocabulary: Vocabulary) => void;
};

export default function RenameVocabulary({
  selectedVocabulary,
  onRenamed,
}: Props) {
  const t = useTranslations('vocabulary');
  const tCommon = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const { group, user } = useAuth();
  const isActive = selectedVocabulary !== null;

  const handleRename = async () => {
    if (!selectedVocabulary || !newName.trim() || !group || !user) return;
    try {
      const updated = await vocabulariesApi.rename({
        vocabularyId:      selectedVocabulary.id,
        vocabularyName:    newName.trim(),
        vocabularyInGroup: group.id,
        authorId:          user.id,
      });
      if (!updated) throw new Error('Failed to rename vocabulary');
      onRenamed(updated);
      setIsOpen(false);
      setNewName('');
    } catch (error) {
      console.error('renameVocabulary failed:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setNewName('');
  };

  return (
    <>
      <Button
        variant="primary"
        fullWidth
        className="clay-action-btn"
        onClick={() => isActive && setIsOpen(true)}
        disabled={!isActive}
      >
        <Icon name="pencil" size={18} />
        {t('renameVocabulary')}
      </Button>

      {selectedVocabulary && (
        <Dialog
          open={isOpen}
          onClose={handleClose}
          title={t('rename.title', { name: selectedVocabulary.name })}
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
      )}
    </>
  );
}
