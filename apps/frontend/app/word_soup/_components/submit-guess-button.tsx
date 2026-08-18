'use client';

import { useTranslations } from 'next-intl';
import { Button } from '../../components/ui/button';

type SubmitGuessButtonProps = {
  onSubmitGuess: () => void;
  selectionCount: number;
  isSubmittingGuess: boolean;
  isLocalPlayerFrozen: boolean;
  freezeSecondsLeft: number;
  /** Stretch to fill the shared actions row (aligns with Leave / Game Over). */
  fillHeight?: boolean;
};

export default function SubmitGuessButton({
  onSubmitGuess,
  selectionCount,
  isSubmittingGuess,
  isLocalPlayerFrozen,
  freezeSecondsLeft,
  fillHeight = false,
}: SubmitGuessButtonProps) {
  const t = useTranslations('games.wordSoup');

  return (
    <div className={['z-10 w-full', fillHeight ? 'h-full' : 'sticky bottom-2'].join(' ')}>
      <Button
        variant="secondary"
        fullWidth
        size="lg"
        onClick={onSubmitGuess}
        disabled={selectionCount < 2 || isSubmittingGuess || isLocalPlayerFrozen}
        className={['shadow-md', fillHeight ? '!h-full' : ''].join(' ')}
      >
        {isLocalPlayerFrozen
          ? t('frozen', { seconds: freezeSecondsLeft })
          : isSubmittingGuess
            ? t('submitting')
            : t('submitGuess')}
      </Button>
    </div>
  );
}
