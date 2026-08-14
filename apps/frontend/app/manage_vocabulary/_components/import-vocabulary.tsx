'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

type Props = {
  onImported: (vocabulary: Vocabulary) => void;
};

const LANGUAGE_CODES = ['en', 'fr', 'de'] as const;

export default function ImportVocabulary({ onImported }: Props) {
  const t = useTranslations('vocabulary');
  const { user, group } = useAuth();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [fromLanguage, setFromLanguage] = useState('fr');
  const [toLanguage, setToLanguage] = useState('en');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAiExtract = async () => {
    if (!selectedFile || !user || !group) return;
    setIsExtracting(true);
    try {
      const fromLangName = t(`languages.${fromLanguage}` as 'languages.en');
      const toLangName = t(`languages.${toLanguage}` as 'languages.en');
      const data = await vocabulariesApi.extract(selectedFile, fromLangName, toLangName);

      const created = await vocabulariesApi.create({
        vocabularyInGroup: group.id,
        byUser: user.id,
        vocabularyName: data.title,
        vocabularyWords: data.words,
        vocabularyMeanings: data.meanings,
      });

      onImported(created);
      setSelectedFile(null);
    } catch (error: unknown) {
      console.error('AI extraction failed', error);
      const message =
        error instanceof Error ? error.message : t('extractionFailed');
      alert(message);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Card className="col-span-2 space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground">{t('importTitle')}</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">{t('fromLanguage')}</label>
          <select
            value={fromLanguage}
            onChange={(e) => setFromLanguage(e.target.value)}
            className="clay-input w-full text-sm"
          >
            {LANGUAGE_CODES.map((code) => (
              <option key={code} value={code}>{t(`languages.${code}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">{t('toLanguage')}</label>
          <select
            value={toLanguage}
            onChange={(e) => setToLanguage(e.target.value)}
            className="clay-input w-full text-sm"
          >
            {LANGUAGE_CODES.map((code) => (
              <option key={code} value={code}>{t(`languages.${code}`)}</option>
            ))}
          </select>
        </div>
      </div>

      <input
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileChange}
        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
      />

      <Button
        variant="accent"
        fullWidth
        onClick={handleAiExtract}
        disabled={!selectedFile || isExtracting}
      >
        {isExtracting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 mr-3 border-2 border-current border-t-transparent rounded-full" viewBox="0 0 24 24"></svg>
            {t('aiReading')}
          </span>
        ) : t('extractAndSave')}
      </Button>
    </Card>
  );
}
