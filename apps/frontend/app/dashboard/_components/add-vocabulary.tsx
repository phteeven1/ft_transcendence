'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';
import { Button, Dialog, Icon, Input } from '../../components/ui';
import VocabularyEntriesList, {
  type VocabularyEntry,
} from './vocabulary-entries-list';
import {
  areVocabularyEntriesValid,
  completeEntries,
  hasDuplicateWordOrMeaning,
  MIN_VOCAB_PAIRS,
} from './vocabulary-entry-rules';

const LANGUAGE_CODES = ['en', 'fr', 'de'] as const;

type Props = {
  open: boolean;
  onClose: () => void;
  vocabulary?: Vocabulary | null;
  onImported: (vocabulary: Vocabulary) => void;
  onEdited: (vocabulary: Vocabulary) => void;
};

export default function AddVocabulary({
  open,
  onClose,
  vocabulary = null,
  onImported,
  onEdited,
}: Props) {
  const t = useTranslations('vocabulary');
  const tCommon = useTranslations('common');
  const { user, group } = useAuth();
  const [name, setName] = useState('');
  const [entries, setEntries] = useState<VocabularyEntry[]>([]);
  const [error, setError] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiError, setAiError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [fromLanguage, setFromLanguage] = useState('fr');
  const [toLanguage, setToLanguage] = useState('en');
  const isEditing = vocabulary !== null;

  useEffect(() => {
    if (!open) return;
    if (vocabulary) {
      setName(vocabulary.name);
      setEntries(
        vocabulary.words.map((word, index) => ({
          word,
          meaning: vocabulary.meanings[index] ?? '',
        })),
      );
    } else {
      setName('');
      setEntries([]);
    }
    setError('');
    setAiOpen(false);
    setAiError('');
    setSelectedFile(null);
  }, [open, vocabulary]);

  const handleClose = () => {
    setName('');
    setEntries([]);
    setError('');
    setAiOpen(false);
    setAiError('');
    setSelectedFile(null);
    onClose();
  };

  const handleCloseAi = () => {
    setSelectedFile(null);
    setAiError('');
    setAiOpen(false);
  };

  const validEntries = completeEntries(entries);
  const hasDuplicate = hasDuplicateWordOrMeaning(entries);
  const canSave = name.trim() !== '' && areVocabularyEntriesValid(entries);

  const handleSave = async () => {
    if (!user || !group) return;
    if (!name.trim()) {
      setError(t('listNameRequired'));
      return;
    }
    if (validEntries.length < MIN_VOCAB_PAIRS) {
      setError(t('minimumWordsAlert'));
      return;
    }
    if (hasDuplicate) {
      setError(t('duplicatePairAlert'));
      return;
    }
    setError('');
    const words = validEntries.map((entry) => entry.word);
    const meanings = validEntries.map((entry) => entry.meaning);
    try {
      if (vocabulary) {
        let updated = vocabulary;
        if (name.trim() !== vocabulary.name) {
          const renamed = await vocabulariesApi.rename({
            vocabularyId: vocabulary.id,
            vocabularyName: name.trim(),
            vocabularyInGroup: group.id,
          });
          if (!renamed) {
            setError(tCommon('somethingWentWrong'));
            return;
          }
          updated = renamed;
        }
        const withEntries = await vocabulariesApi.updateEntries({
          vocabularyId: updated.id,
          vocabularyWords: words,
          vocabularyMeanings: meanings,
        });
        if (!withEntries) {
          setError(tCommon('somethingWentWrong'));
          return;
        }
        onEdited({ ...withEntries, name: updated.name });
        handleClose();
        return;
      }

      const created = await vocabulariesApi.create({
        vocabularyInGroup: group.id,
        byUser: user.id,
        vocabularyName: name.trim(),
        vocabularyWords: words,
        vocabularyMeanings: meanings,
      });
      onImported(created);
      handleClose();
    } catch {
      setError(isEditing ? tCommon('somethingWentWrong') : t('createFailed'));
    }
  };

  const handleAiExtract = async () => {
    if (!selectedFile) return;
    setIsExtracting(true);
    setAiError('');
    try {
      const fromLangName = t(`languages.${fromLanguage}` as 'languages.en');
      const toLangName = t(`languages.${toLanguage}` as 'languages.en');
      const data = await vocabulariesApi.extract(
        selectedFile,
        fromLangName,
        toLangName,
      );
      setName((current) => current.trim() || data.title);
      setEntries(
        data.words.map((word, index) => ({
          word,
          meaning: data.meanings[index] ?? '',
        })),
      );
      handleCloseAi();
    } catch (extractError: unknown) {
      const message =
        extractError instanceof Error
          ? extractError.message
          : t('extractionFailed');
      setAiError(message);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        title={
          isEditing
            ? t('edit.title', { name: vocabulary.name })
            : t('newVocabulary')
        }
        wide
        scrollable
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 border-t border-border pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setAiError('');
                setAiOpen(true);
              }}
            >
              <span className="inline-flex items-center gap-2">
                <Icon name="upload" size={16} />
                {t('aiUpload')}
              </span>
            </Button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleClose}>
                {tCommon('cancel')}
              </Button>
              <Button
                variant="accent"
                onClick={() => void handleSave()}
                disabled={!canSave}
              >
                {isEditing ? t('commitChanges') : tCommon('create')}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('listNameLabel')}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('listNamePlaceholder')}
          />
          <VocabularyEntriesList
            entries={entries}
            onEntriesChange={setEntries}
            minEntries={isEditing ? MIN_VOCAB_PAIRS : 0}
          />
          {hasDuplicate && (
            <p className="text-sm text-destructive">{t('duplicatePairAlert')}</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </Dialog>

      <Dialog
        open={aiOpen}
        onClose={handleCloseAi}
        title={t('importTitle')}
        wide
        footer={
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="ghost" onClick={handleCloseAi}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="accent"
              onClick={() => void handleAiExtract()}
              disabled={!selectedFile || isExtracting}
            >
              {isExtracting ? (
                <span className="inline-flex items-center gap-2">
                  <Icon name="spinner" size={20} className="animate-spin" />
                  {t('aiReading')}
                </span>
              ) : (
                t('extractWithAi')
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                {t('fromLanguage')}
              </label>
              <select
                value={fromLanguage}
                onChange={(e) => {
                  setFromLanguage(e.target.value);
                  setAiError('');
                }}
                className="clay-input w-full text-sm"
              >
                {LANGUAGE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {t(`languages.${code}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                {t('toLanguage')}
              </label>
              <select
                value={toLanguage}
                onChange={(e) => {
                  setToLanguage(e.target.value);
                  setAiError('');
                }}
                className="clay-input w-full text-sm"
              >
                {LANGUAGE_CODES.map((code) => (
                  <option key={code} value={code}>
                    {t(`languages.${code}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => {
              if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
              setAiError('');
            }}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
          />
          {aiError && <p className="text-sm text-destructive">{aiError}</p>}
        </div>
      </Dialog>
    </>
  );
}
