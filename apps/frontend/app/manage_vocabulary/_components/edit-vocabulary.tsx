'use client';
import React, { useRef, useState } from 'react';
import { Vocabulary } from '../../types';

type Props = {
  selectedVocabulary: Vocabulary | null;
  onEdited: (updated: Vocabulary) => void;
};

type Entry = {
  word: string;
  meaning: string;
};

export default function EditVocabulary({
  selectedVocabulary,
  onEdited,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const wordRefs = useRef<(HTMLInputElement | null)[]>([]);
  const meaningRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isActive = selectedVocabulary !== null;

  const handleOpen = () => {
    if (!selectedVocabulary) return;
    setEntries(
      selectedVocabulary.words.map((word, i) => ({
        word,
        meaning: selectedVocabulary.meanings[i] ?? '',
      })),
    );
    setIsOpen(true);
  };

  const handleChange = (
    index: number,
    field: 'word' | 'meaning',
    value: string,
  ) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: 'word' | 'meaning',
  ) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    if (field === 'word') {
      meaningRefs.current[index]?.focus();
    } else {
      const nextIndex = index + 1;
      if (nextIndex < entries.length) {
        wordRefs.current[nextIndex]?.focus();
      } else {
        wordRefs.current[0]?.focus();
      }
    }
  };

  const handleCommit = async () => {
    if (!selectedVocabulary) return;
    const updatedWords = entries.map((e) => e.word);
    const updatedMeanings = entries.map((e) => e.meaning);
    try {
      const res = await fetch(
        'http://localhost:4000/vocabularies/update-entries',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vocabularyId: selectedVocabulary.id,
            vocabularyWords: updatedWords,
            vocabularyMeanings: updatedMeanings,
          }),
        },
      );
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const updated: Vocabulary = await res.json();
      onEdited(updated);
      setIsOpen(false);
    } catch (error) {
      console.error('editVocabulary failed:', error);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={!isActive}
        className={`w-full p-2 rounded transition-colors ${
          isActive
            ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
        }`}
      >
        Edit Vocabulary
      </button>

      {isOpen && selectedVocabulary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[80vh] flex flex-col gap-4">
            <h2 className="text-xl font-bold">
              Edit: {selectedVocabulary.name}
            </h2>

            <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="font-semibold text-gray-500 text-sm pb-1">
                  Word
                </div>
                <div className="font-semibold text-gray-500 text-sm pb-1">
                  Meaning
                </div>

                {entries.map((entry, index) => (
                  <React.Fragment key={index}>
                    <input
                      ref={(el) => {
                        wordRefs.current[index] = el;
                      }}
                      value={entry.word}
                      onChange={(e) =>
                        handleChange(index, 'word', e.target.value)
                      }
                      onKeyDown={(e) => handleKeyDown(e, index, 'word')}
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                    />
                    <input
                      ref={(el) => {
                        meaningRefs.current[index] = el;
                      }}
                      value={entry.meaning}
                      onChange={(e) =>
                        handleChange(index, 'meaning', e.target.value)
                      }
                      onKeyDown={(e) => handleKeyDown(e, index, 'meaning')}
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCommit}
                className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Commit Changes
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
