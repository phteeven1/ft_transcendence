'use client';
import { useAuth } from '../../context/auth-context';
import { Vocabulary } from '../../types';

type Props = {
  selectedVocabulary: Vocabulary | null;
  onActivated: (vocabulary: Vocabulary) => void;
};

export default function UseInGames({ selectedVocabulary, onActivated }: Props) {
  const { group } = useAuth();

  const isActive = selectedVocabulary !== null && !selectedVocabulary.isActive;

  const handleClick = async () => {
    if (!selectedVocabulary || !group) return;
    try {
      const res = await fetch('http://localhost:4000/vocabularies/setActive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vocabularyId: selectedVocabulary.id,
          vocabularyInGroup: group.id,
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const updated: Vocabulary = await res.json();
      onActivated(updated);
    } catch (error) {
      console.error('useInGames failed:', error);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!isActive}
      className={`w-full p-2 rounded transition-colors ${
        isActive
          ? 'bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer'
          : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
      }`}
    >
      Use in Games
    </button>
  );
}
