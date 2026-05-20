'use client';
import { useState } from 'react';
import { Vocabulary } from '../../types';

type Props = {
  selectedVocabulary: Vocabulary | null;
  onDeleted: (vocabularyId: number) => void;
};

export default function DeleteVocabulary({
  selectedVocabulary,
  onDeleted,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const isActive = selectedVocabulary !== null;

  const handleDelete = async () => {
    if (!selectedVocabulary) return;
    try {
      const res = await fetch('http://localhost:4000/vocabularies/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabularyId: selectedVocabulary.id }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      onDeleted(selectedVocabulary.id);
      setIsOpen(false);
    } catch (error) {
      console.error('deleteVocabulary failed:', error);
    }
  };

  return (
    <>
      <button
        onClick={() => isActive && setIsOpen(true)}
        disabled={!isActive}
        className={`w-full p-2 rounded transition-colors ${
          isActive
            ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
        }`}
      >
        Delete Vocabulary
      </button>

      {isOpen && selectedVocabulary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">
              Delete {selectedVocabulary.name}?
            </h2>
            <p className="text-gray-600">
              This will permanently delete this vocabulary list. This cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500 text-white p-2 rounded hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
