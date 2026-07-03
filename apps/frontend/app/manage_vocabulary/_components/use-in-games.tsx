'use client';
import { useAuth } from '../../context/auth-context';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';

type Props = {
  selectedVocabulary: Vocabulary | null;
  onActivated: (vocabulary: Vocabulary) => void;
};

export default function UseInGames({ selectedVocabulary, onActivated }: Props) {
  const { group, user } = useAuth();

  const isActive = selectedVocabulary !== null && selectedVocabulary.id !== group?.currentVocabulary;

  const handleClick = async () => {
    if (!selectedVocabulary || !group || !user) return;
    try {
      const updated = await vocabulariesApi.setActive({
        vocabularyId:      selectedVocabulary.id,
        vocabularyInGroup: group.id,
        authorId:          user.id,
      });
      if (!updated) throw new Error('Failed to activate vocabulary');
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
