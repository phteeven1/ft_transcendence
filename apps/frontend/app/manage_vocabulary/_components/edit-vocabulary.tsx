'use client';
import React, { useRef, useState } from 'react';
import { vocabulariesApi } from '@/lib/api';
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
        handleAddRow();
      }
    }
  };

  const handleAddRow = () => {
    setEntries((prev) => [...prev, { word: '', meaning: '' }]);
    // Use timeout to focus the new row after it renders
    setTimeout(() => {
      wordRefs.current[entries.length]?.focus();
    }, 0);
  };

  const handleDeleteRow = (index: number) => {
    if (entries.length <= 5) return;
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCommit = async () => {
    if (!selectedVocabulary) return;
    // Filter out empty rows
    const validEntries = entries.filter(e => e.word.trim() !== '' || e.meaning.trim() !== '');
    
    if (validEntries.length < 5) {
      alert("A vocabulary list must have at least 5 words.");
      return;
    }

    const updatedWords = validEntries.map((e) => e.word.trim());
    const updatedMeanings = validEntries.map((e) => e.meaning.trim());
    try {
      const updated = await vocabulariesApi.updateEntries({
        vocabularyId: selectedVocabulary.id,
        vocabularyWords: updatedWords,
        vocabularyMeanings: updatedMeanings,
      });
      if (!updated) throw new Error('Failed to update vocabulary');
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
              <div className="grid grid-cols-[1fr_1fr_40px] gap-x-4 gap-y-2 items-center">
                <div className="font-semibold text-gray-500 text-sm pb-1">
                  Word
                </div>
                <div className="font-semibold text-gray-500 text-sm pb-1">
                  Meaning
                </div>
                <div></div>

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
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400 w-full"
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
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400 w-full"
                    />
                    <button
                      onClick={() => handleDeleteRow(index)}
                      disabled={entries.length <= 5}
                      title={entries.length <= 5 ? "Minimum 5 words required" : "Delete word"}
                      className={`text-lg font-bold rounded-full w-8 h-8 flex items-center justify-center transition-colors ${
                        entries.length <= 5
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-red-500 hover:bg-red-50'
                      }`}
                    >
                      ×
                    </button>
                  </React.Fragment>
                ))}
              </div>

              <button
                onClick={handleAddRow}
                className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <span className="text-xl">+</span> Add Word Pair
              </button>
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
