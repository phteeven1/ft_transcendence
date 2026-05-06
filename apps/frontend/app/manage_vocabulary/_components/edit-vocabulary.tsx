'use client';
import { Vocabulary } from '../../types';

type Props = {
  selectedVocabulary: Vocabulary | null;
};

export default function EditVocabulary({ selectedVocabulary }: Props) {
  return (
    <button
      disabled
      className="w-full bg-gray-200 text-gray-400 p-2 rounded cursor-not-allowed opacity-50"
    >
      Edit Vocabulary
    </button>
  );
}