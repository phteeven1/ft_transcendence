'use client';
import { Vocabulary } from '../../types';

type Props = {
  vocabularies: Vocabulary[];
  selectedVocabulary: Vocabulary | null;
  currentVocabulary: number | undefined;
  isLoading: boolean;
  onSelect: (vocabulary: Vocabulary) => void;
};

export default function VocabularyList({
  vocabularies,
  selectedVocabulary,
  currentVocabulary,
  isLoading,
  onSelect,
}: Props) {
  if (isLoading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (vocabularies.length === 0)
    return <p className="text-gray-500 text-sm italic">No vocabularies yet.</p>;

  return (
    <ul className="overflow-y-auto max-h-64 md:max-h-full md:h-full border border-emerald-300 rounded">
      {vocabularies.map((vocabulary) => (
        <li key={vocabulary.id} className="border-b border-emerald-300 last:border-b-0">
          <button
            onClick={() => onSelect(vocabulary)}
            className={`w-full text-left px-3 py-2 transition-colors flex items-center justify-between ${
              selectedVocabulary?.id === vocabulary.id
                ? 'bg-blue-50 font-medium text-blue-700'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            <span>{vocabulary.name}</span>
            {vocabulary.id === currentVocabulary && (
              <span className="text-xs font-semibold text-emerald-600">Active</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}