'use client';

import { useState } from 'react';
import { Vocabulary } from '../../types';
import VocabularyList, { VocabularyAction } from './vocabulary-list';
import RenameVocabulary from './rename-vocabulary';
import EditVocabulary from './edit-vocabulary';
import DeleteVocabulary from './delete-vocabulary';

type Props = {
  vocabularies: Vocabulary[];
  currentVocabulary: number | undefined;
  isLoading: boolean;
  onSelect: (vocabulary: Vocabulary) => void;
  onRenamed: (vocabulary: Vocabulary) => void;
  onEdited: (vocabulary: Vocabulary) => void;
  onDeleted: (vocabularyId: number) => void;
};

export default function VocabularyPanel({
  vocabularies,
  currentVocabulary,
  isLoading,
  onSelect,
  onRenamed,
  onEdited,
  onDeleted,
}: Props) {
  const [actionVocabulary, setActionVocabulary] = useState<Vocabulary | null>(
    null,
  );
  const [vocabDialog, setVocabDialog] = useState<VocabularyAction | null>(null);

  const closeDialog = () => {
    setVocabDialog(null);
    setActionVocabulary(null);
  };

  const handleAction = (action: VocabularyAction, vocabulary: Vocabulary) => {
    setActionVocabulary(vocabulary);
    setVocabDialog(action);
  };

  return (
    <div
      role="tabpanel"
      id="vocabulary-panel"
      className="overflow-y-auto flex-1"
    >
      <VocabularyList
        vocabularies={vocabularies}
        currentVocabulary={currentVocabulary}
        isLoading={isLoading}
        onSelect={onSelect}
        onAction={handleAction}
      />
      <RenameVocabulary
        vocabulary={actionVocabulary}
        open={vocabDialog === 'rename'}
        onClose={closeDialog}
        onRenamed={onRenamed}
      />
      <EditVocabulary
        vocabulary={actionVocabulary}
        open={vocabDialog === 'edit'}
        onClose={closeDialog}
        onEdited={onEdited}
      />
      <DeleteVocabulary
        vocabulary={actionVocabulary}
        open={vocabDialog === 'delete'}
        onClose={closeDialog}
        onDeleted={onDeleted}
      />
    </div>
  );
}
