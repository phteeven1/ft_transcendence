'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';

type Props = {
  onImported: (vocabulary: Vocabulary) => void;
};

const DUMMY_WORDS = [
  'construire',
  'élever',
  'remplir',
  'ressembler',
  'le vivarium',
  'la terre',
  "l'insecte",
  'le phasme',
  'la brindille',
  'la cour',
  'jamais',
  'dans',
];

const DUMMY_MEANINGS = [
  'to build',
  'to raise',
  'to fill',
  'to resemble',
  'the vivarium',
  'the earth / soil',
  'the insect',
  'the stick insect',
  'the twig',
  'the yard / courtyard',
  'never',
  'in / inside',
];

export default function ImportVocabulary({ onImported }: Props) {
  const { user, group } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleImport = async () => {
    if (!user || !group) return;
    try {
      const created = await vocabulariesApi.create({
        vocabularyInGroup: group.id,
        byUser: user.id,
        vocabularyName: 'French Test List',
        vocabularyWords: DUMMY_WORDS,
        vocabularyMeanings: DUMMY_MEANINGS,
      });
      onImported(created);
      setShowConfirm(true);
    } catch (error) {
      console.error('importVocabulary failed:', error);
    }
  };

  return (
  <div className="space-y-4">
  <input 
    type="file" 
    accept="image/*,.pdf" 
    onChange={handleFileChange}
    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
  />
  
  <button
    onClick={handleAiExtract}
    disabled={!selectedFile || isExtracting}
    className="w-full bg-blue-600 text-white p-2 rounded disabled:bg-gray-400"
  >
    {isExtracting ? 'AI is reading...' : 'Extract with AI'}
  </button>
  </div>
  );
}
