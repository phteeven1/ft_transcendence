'use client';
import { useAuth } from '../../context/auth-context';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';
import { Button } from '../../components/ui/button';

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
    <Button
      variant="accent"
      fullWidth
      className="clay-action-btn"
      onClick={handleClick}
      disabled={!isActive}
    >
      Use in Games
    </Button>
  );
}
