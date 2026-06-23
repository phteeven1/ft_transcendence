'use client';
import { useState } from 'react';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';

type Props = {
  selectedVocabulary: Vocabulary | null;
  onDeleted: (vocabularyId: number) => void;
};

export default function DeleteVocabulary({
  selectedVocabulary,
  onDeleted,
}: Props) {
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
        Delete Vocabulary
      </Button>

      {selectedVocabulary && (
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title={`Delete ${selectedVocabulary.name}?`}
          confirmLabel="Delete"
          confirmVariant="destructive"
          onConfirm={handleDelete}
        >
          <p>
            This will permanently delete this vocabulary list. This cannot be
            undone.
          </p>
        </Dialog>
      )}
    </>
  );
}
