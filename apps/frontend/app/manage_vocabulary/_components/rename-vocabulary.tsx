'use client';
import { useState } from 'react';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

type Props = {
  selectedVocabulary: Vocabulary | null;
  onRenamed: (vocabulary: Vocabulary) => void;
};

export default function RenameVocabulary({
  selectedVocabulary,
  onRenamed,
}: Props) {
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
        Rename Vocabulary
      </Button>

      {selectedVocabulary && (
        <Dialog
          open={isOpen}
          onClose={handleClose}
          title={`Rename ${selectedVocabulary.name}`}
          confirmLabel="Rename"
          onConfirm={handleRename}
          confirmDisabled={!newName.trim()}
        >
          <Input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New name"
            autoComplete="off"
          />
        </Dialog>
      )}
    </>
  );
}
