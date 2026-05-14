'use client';
import { Vocabulary } from '../../types';

type Props = {
  vocabularies: Vocabulary[];
  selectedVocabulary: Vocabulary | null;
  isLoading: boolean;
  onSelect: (vocabulary: Vocabulary) => void;
};

export default function VocabularyList({
  vocabularies,
  selectedVocabulary,
  isLoading,
  onSelect,
}: Props) {
  if (isLoading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (vocabularies.length === 0)
    return <p className="text-gray-500 text-sm italic">No vocabularies yet.</p>;

  return (
    <div className="space-y-2">
      {vocabularies.map((vocabulary) => (
        <button
          key={vocabulary.id}
          onClick={() => onSelect(vocabulary)}
          className={`w-full text-left p-3 rounded border-2 transition-colors ${
            selectedVocabulary?.id === vocabulary.id
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-blue-300'
          }`}
        >
          <span>{vocabulary.name}</span>
          {vocabulary.isActive && (
            <span className="ml-2 text-xs font-semibold text-emerald-600">
              Active
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
