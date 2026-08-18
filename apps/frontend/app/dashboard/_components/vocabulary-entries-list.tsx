'use client';

import { KeyboardEvent, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '../../components/ui';
import ListRow from './list-row';
import NewListRow from './new-list-row';
import {
  MAX_VOCAB_ENTRY_CHARS,
  canAddVocabularyEntry,
  duplicateFieldKeys,
  stripEntryWhitespace,
} from './vocabulary-entry-rules';

export type VocabularyEntry = {
  word: string;
  meaning: string;
};

type Props = {
  entries: VocabularyEntry[];
  onEntriesChange: (entries: VocabularyEntry[]) => void;
  minEntries?: number;
};

export default function VocabularyEntriesList({
  entries,
  onEntriesChange,
  minEntries = 0,
}: Props) {
  const t = useTranslations('vocabulary');
  const wordRefs = useRef<(HTMLInputElement | null)[]>([]);
  const meaningRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(
    index: number,
    field: 'word' | 'meaning',
    value: string,
  ): void {
    onEntriesChange(
      entries.map((entry, i) =>
        i === index
          ? {
              ...entry,
              [field]: stripEntryWhitespace(value),
            }
          : entry,
      ),
    );
  }

  function handleAddRow(): void {
    if (!canAddVocabularyEntry(entries)) return;
    onEntriesChange([...entries, { word: '', meaning: '' }]);
    const nextIndex = entries.length;
    setTimeout(() => {
      wordRefs.current[nextIndex]?.focus();
    }, 0);
  }

  function handleDeleteRow(index: number): void {
    if (entries.length <= minEntries) return;
    onEntriesChange(entries.filter((_, i) => i !== index));
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    index: number,
    field: 'word' | 'meaning',
  ): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    if (field === 'word') {
      meaningRefs.current[index]?.focus();
      return;
    }

    const nextIndex = index + 1;
    if (nextIndex < entries.length) {
      wordRefs.current[nextIndex]?.focus();
      return;
    }
    handleAddRow();
  }

  const canDelete = entries.length > minEntries;
  const canAddRow = canAddVocabularyEntry(entries);
  const duplicates = duplicateFieldKeys(entries);

  return (
    <div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3 pb-1 text-sm font-semibold text-muted-foreground">
        <span>{t('wordColumn')}</span>
        <span>{t('meaningColumn')}</span>
        <span className="w-8" />
      </div>
      <ul className="list-none m-0 flex flex-col gap-1 p-0">
        {entries.map((entry, index) => {
          const isWordDuplicate = duplicates.words.has(
            entry.word.trim().toLowerCase(),
          );
          const isMeaningDuplicate = duplicates.meanings.has(
            entry.meaning.trim().toLowerCase(),
          );

          return (
            <ListRow
              key={index}
              menu={
                <button
                  type="button"
                  onClick={() => handleDeleteRow(index)}
                  disabled={!canDelete}
                  title={
                    canDelete ? t('deleteWordTitle') : t('minimumWordsTitle')
                  }
                  className={`shrink-0 p-1 rounded-lg ${
                    canDelete
                      ? 'text-muted-foreground hover:text-destructive cursor-pointer'
                      : 'text-muted-foreground/40 cursor-not-allowed'
                  }`}
                >
                  <Icon name="trash" size={16} />
                </button>
              }
            >
              <div className="grid grid-cols-2 gap-2">
                <input
                  ref={(el) => {
                    wordRefs.current[index] = el;
                  }}
                  value={entry.word}
                  maxLength={MAX_VOCAB_ENTRY_CHARS}
                  onChange={(e) => handleChange(index, 'word', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index, 'word')}
                  className={[
                    'clay-input text-sm w-full',
                    isWordDuplicate ? 'clay-input-error' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-invalid={isWordDuplicate}
                  aria-label={t('wordColumn')}
                />
                <input
                  ref={(el) => {
                    meaningRefs.current[index] = el;
                  }}
                  value={entry.meaning}
                  maxLength={MAX_VOCAB_ENTRY_CHARS}
                  onChange={(e) =>
                    handleChange(index, 'meaning', e.target.value)
                  }
                  onKeyDown={(e) => handleKeyDown(e, index, 'meaning')}
                  className={[
                    'clay-input text-sm w-full',
                    isMeaningDuplicate ? 'clay-input-error' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-invalid={isMeaningDuplicate}
                  aria-label={t('meaningColumn')}
                />
              </div>
            </ListRow>
          );
        })}
        <NewListRow
          label={t('addWordPair')}
          onSelect={handleAddRow}
          disabled={!canAddRow}
        />
      </ul>
    </div>
  );
}
