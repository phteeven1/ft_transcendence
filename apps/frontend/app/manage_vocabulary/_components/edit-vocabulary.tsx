'use client';
import React, { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';
import { Button } from '../../components/ui/button';
import { Dialog } from '../../components/ui/dialog';

type Props = {
  selectedVocabulary: Vocabulary | null;
  onEdited: (updated: Vocabulary) => void;
};

type Entry = {
  word: string;
  meaning: string;
};

export default function EditVocabulary({
  selectedVocabulary,
  onEdited,
}: Props) {
  const t = useTranslations('vocabulary');
  const tCommon = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const wordRefs = useRef<(HTMLInputElement | null)[]>([]);
  const meaningRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isActive = selectedVocabulary !== null;

  const handleOpen = () => {
    if (!selectedVocabulary) return;
    setEntries(
      selectedVocabulary.words.map((word, i) => ({
        word,
        meaning: selectedVocabulary.meanings[i] ?? '',
      })),
    );
    setIsOpen(true);
  };

  const handleChange = (
    index: number,
    field: 'word' | 'meaning',
    value: string,
  ) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: 'word' | 'meaning',
  ) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    if (field === 'word') {
      meaningRefs.current[index]?.focus();
    } else {
      const nextIndex = index + 1;
      if (nextIndex < entries.length) {
        wordRefs.current[nextIndex]?.focus();
      } else {
        handleAddRow();
      }
    }
  };

  const handleAddRow = () => {
    setEntries((prev) => [...prev, { word: '', meaning: '' }]);
    setTimeout(() => {
      wordRefs.current[entries.length]?.focus();
    }, 0);
  };

  const handleDeleteRow = (index: number) => {
    if (entries.length <= 5) return;
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCommit = async () => {
    if (!selectedVocabulary) return;
    const validEntries = entries.filter(e => e.word.trim() !== '' || e.meaning.trim() !== '');

    if (validEntries.length < 5) {
      alert(t('minimumWordsAlert'));
      return;
    }

    const updatedWords = validEntries.map((e) => e.word.trim());
    const updatedMeanings = validEntries.map((e) => e.meaning.trim());
    try {
      const updated = await vocabulariesApi.updateEntries({
        vocabularyId: selectedVocabulary.id,
        vocabularyWords: updatedWords,
        vocabularyMeanings: updatedMeanings,
      });
      if (!updated) throw new Error('Failed to update vocabulary');
      onEdited(updated);
      setIsOpen(false);
    } catch (error) {
      console.error('editVocabulary failed:', error);
    }
  };

  return (
    <>
      <Button
        variant="primary"
        fullWidth
        className="clay-action-btn"
        onClick={handleOpen}
        disabled={!isActive}
      >
        {t('editVocabulary')}
      </Button>

      {selectedVocabulary && (
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title={t('edit.title', { name: selectedVocabulary.name })}
          wide
          scrollable
          footer={
            <div className="flex gap-3 shrink-0 border-t border-border pt-4">
              <Button variant="accent" fullWidth onClick={handleCommit}>
                {t('commitChanges')}
              </Button>
              <Button variant="ghost" fullWidth onClick={() => setIsOpen(false)}>
                {tCommon('cancel')}
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-[1fr_1fr_40px] gap-x-4 gap-y-2 items-center">
            <div className="font-semibold text-muted-foreground text-sm pb-1">
              {t('wordColumn')}
            </div>
            <div className="font-semibold text-muted-foreground text-sm pb-1">
              {t('meaningColumn')}
            </div>
            <div></div>

            {entries.map((entry, index) => (
              <React.Fragment key={index}>
                <input
                  ref={(el) => {
                    wordRefs.current[index] = el;
                  }}
                  value={entry.word}
                  onChange={(e) =>
                    handleChange(index, 'word', e.target.value)
                  }
                  onKeyDown={(e) => handleKeyDown(e, index, 'word')}
                  className="clay-input text-sm w-full"
                />
                <input
                  ref={(el) => {
                    meaningRefs.current[index] = el;
                  }}
                  value={entry.meaning}
                  onChange={(e) =>
                    handleChange(index, 'meaning', e.target.value)
                  }
                  onKeyDown={(e) => handleKeyDown(e, index, 'meaning')}
                  className="clay-input text-sm w-full"
                />
                <button
                  onClick={() => handleDeleteRow(index)}
                  disabled={entries.length <= 5}
                  title={entries.length <= 5 ? t('minimumWordsTitle') : t('deleteWordTitle')}
                  className={`text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center transition-colors ${
                    entries.length <= 5
                      ? 'text-muted-foreground cursor-not-allowed'
                      : 'text-destructive hover:bg-muted'
                  }`}
                >
                  ×
                </button>
              </React.Fragment>
            ))}
          </div>

          <button
            onClick={handleAddRow}
            className="mt-4 flex items-center gap-2 text-sm text-primary hover:text-accent font-medium"
          >
            <span className="text-xl">+</span> {t('addWordPair')}
          </button>
        </Dialog>
      )}
    </>
  );
}
