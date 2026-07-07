'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

type Props = {
  onImported: (vocabulary: Vocabulary) => void;
};

export default function ImportVocabulary({ onImported }: Props) {
  const { user, group } = useAuth();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [fromLanguage, setFromLanguage] = useState('fr');
  const [toLanguage, setToLanguage] = useState('en');

  const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'es', name: 'Spanish' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAiExtract = async () => {
    if (!selectedFile || !user || !group) return;
    setIsExtracting(true);
    try {
      const fromLangName = LANGUAGES.find(l => l.code === fromLanguage)?.name || fromLanguage;
      const toLangName = LANGUAGES.find(l => l.code === toLanguage)?.name || toLanguage;
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
    } catch (error: any) {
      console.error("AI extraction failed", error);
      alert(error.message || "AI extraction failed. Please ensure the file has at least 5 words and try again.");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Card className="col-span-2 space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground">AI Vocabulary Import</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">From Language</label>
          <select
            value={fromLanguage}
            onChange={(e) => setFromLanguage(e.target.value)}
            className="clay-input w-full text-sm"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">To Language</label>
          <select
            value={toLanguage}
            onChange={(e) => setToLanguage(e.target.value)}
            className="clay-input w-full text-sm"
          >
            {LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
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
            AI is reading your file...
          </span>
        ) : 'Extract and Save with AI'}
      </Button>
    </Card>
  );
}
