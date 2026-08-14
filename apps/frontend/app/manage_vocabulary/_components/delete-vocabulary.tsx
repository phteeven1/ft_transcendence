'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Icon } from '../../components/ui';

type Props = {
  selectedVocabulary: Vocabulary | null;
  onDeleted: (vocabularyId: number) => void;
};

export default function DeleteVocabulary({
  selectedVocabulary,
  onDeleted,
}: Props) {
  const t = useTranslations('vocabulary');
  const tCommon = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const { group, user } = useAuth();
  const isActive = selectedVocabulary !== null;

  const handleDelete = async () => {
    if (!selectedVocabulary || !group || !user) return;
    try {
      await vocabulariesApi.remove({
        vocabularyId:      selectedVocabulary.id,
        vocabularyInGroup: group.id,
        authorId:          user.id,
      });
      onDeleted(selectedVocabulary.id);
      setIsOpen(false);
    } catch (error) {
      console.error('deleteVocabulary failed:', error);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        fullWidth
        className="clay-action-btn"
        onClick={() => isActive && setIsOpen(true)}
        disabled={!isActive}
      >
        <Icon name="trash" size={18} />
        {t('deleteVocabulary')}
      </Button>

      {selectedVocabulary && (
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title={t('delete.title', { name: selectedVocabulary.name })}
          confirmLabel={tCommon('delete')}
          confirmVariant="destructive"
          onConfirm={handleDelete}
        >
          <p>{t('delete.confirmMessage')}</p>
        </Dialog>
      )}
    </>
  );
}
