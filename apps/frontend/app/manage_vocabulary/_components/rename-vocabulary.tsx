'use client';
import { Vocabulary } from '../../types';

type Props = {
  selectedVocabulary: Vocabulary | null;
};

export default function RenameVocabulary({ selectedVocabulary }: Props) {
  const isActive = selectedVocabulary !== null;

  return (
    <button
      disabled
      className={`w-full p-2 rounded transition-colors ${
        isActive
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
          : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
      }`}
    >
      Rename Vocabulary
    </button>
  );
}