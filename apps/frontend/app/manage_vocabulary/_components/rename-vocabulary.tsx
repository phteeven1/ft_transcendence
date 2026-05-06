'use client';
import { useState } from 'react';
import { Vocabulary } from '../../types';

type Props = {
  selectedVocabulary: Vocabulary | null;
  onRenamed: (vocabulary: Vocabulary) => void;
};

export default function RenameVocabulary({ selectedVocabulary, onRenamed }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const isActive = selectedVocabulary !== null;

  const handleRename = async () => {
    if (!selectedVocabulary || !newName.trim()) return;
    try {
      const res = await fetch('http://localhost:4000/vocabularies/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabularyId: selectedVocabulary.vocabularyId,
          vocabularyName: newName.trim(),
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const updated: Vocabulary = await res.json();
      onRenamed(updated);
      setIsOpen(false);
      setNewName('');
    } catch (error) {
      console.error('renameVocabulary failed:', error);
    }
  };

  return (
    <>
      <button
        onClick={() => isActive && setIsOpen(true)}
        disabled={!isActive}
        className={`w-full p-2 rounded transition-colors ${
          isActive
            ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
        }`}
      >
        Rename Vocabulary
      </button>

      {isOpen && selectedVocabulary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold">Rename {selectedVocabulary.vocabularyName}</h2>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="New name"
              autoComplete="off"
            />
            <div className="flex gap-3">
              <button
                onClick={handleRename}
                disabled={!newName.trim()}
                className={`flex-1 p-2 rounded text-white ${
                  newName.trim()
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Rename
              </button>
              <button
                onClick={() => { setIsOpen(false); setNewName(''); }}
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