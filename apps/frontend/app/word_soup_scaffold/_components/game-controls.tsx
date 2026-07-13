'use client';

import { Button } from '../../components/ui/button';

interface Props {
  onLeave: () => void;
  onGameOver: () => void;
  onSubmitGuess: () => void;
  selectionCount: number;
  isSubmittingGuess: boolean;
  isLocalPlayerFrozen: boolean;
  freezeSecondsLeft: number;
}

export default function GameControls({
  onLeave,
  onGameOver,
  onSubmitGuess,
  selectionCount,
  isSubmittingGuess,
  isLocalPlayerFrozen,
  freezeSecondsLeft,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* Submit Guess Button */}
      <Button variant="secondary" fullWidth onClick={onSubmitGuess} disabled={selectionCount < 2 || isSubmittingGuess || isLocalPlayerFrozen}>
      {isLocalPlayerFrozen
          ? `Frozen! 🧊 ${freezeSecondsLeft}s`
          : isSubmittingGuess
            ? 'Submitting…'
            : 'Submit Guess'}
      </Button>
      {/* Leave Game Button */}
      <Button variant="primary" fullWidth onClick={onLeave}>
        Leave Game
      </Button>
      {/* Game Over Button */}
      <Button variant="destructive" fullWidth onClick={onGameOver}>
        Game Over
      </Button>
    </div>
  );
}
