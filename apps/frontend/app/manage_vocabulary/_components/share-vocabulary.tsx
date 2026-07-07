'use client';
import { Vocabulary } from '../../types';
import { Button } from '../../components/ui/button';

type Props = {
  selectedVocabulary: Vocabulary | null;
};

export default function ShareVocabulary({ selectedVocabulary }: Props) {
  return (
    <Button
      variant="ghost"
      fullWidth
      className="clay-action-btn"
      disabled
    >
      Share Vocabulary
    </Button>
  );
}
