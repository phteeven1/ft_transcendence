'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
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
      const res = await fetch('http://localhost:4000/vocabularies/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabularyInGroup: group.id,
          byUser: user.id,
          vocabularyName: 'French Test List',
          vocabularyWords: DUMMY_WORDS,
          vocabularyMeanings: DUMMY_MEANINGS,
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const created: Vocabulary = await res.json();
      onImported(created);
      setShowConfirm(true);
    } catch (error) {
      console.error('importVocabulary failed:', error);
    }
  };

  return (
    <>
      <button
        onClick={handleImport}
        className="w-full bg-emerald-500 text-white p-2 rounded hover:bg-emerald-600"
      >
        Import Vocabulary
      </button>

      {/* Confirmation popup */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <p className="mb-6 text-gray-700">
              You have saved a hard coded vocabulary list for testing.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
