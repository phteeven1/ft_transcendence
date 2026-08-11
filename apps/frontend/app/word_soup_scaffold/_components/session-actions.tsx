'use client';

import { Button } from '../../components/ui/button';

type SessionActionsProps = {
  onLeave: () => void;
  onGameOver: () => void;
  gameOverDisabled?: boolean;
  /** Stretch to match the submit button row height. */
  fillHeight?: boolean;
};

/** Leave / Game Over — height-matched to Submit Guess when fillHeight. */
export default function SessionActions({
  onLeave,
  onGameOver,
  gameOverDisabled = false,
  fillHeight = false,
}: SessionActionsProps) {
  return (
    <div
      className={[
        'flex w-full flex-col gap-1.5',
        fillHeight ? 'h-full' : '',
      ].join(' ')}
    >
      <Button
        variant="primary"
        size="sm"
        fullWidth
        onClick={onLeave}
        className={fillHeight ? 'min-h-0 flex-1' : ''}
      >
        Leave Game
      </Button>
      <Button
        variant="ghost"
        size="sm"
        fullWidth
        onClick={onGameOver}
        disabled={gameOverDisabled}
        className={[
          'border border-red-300/80 text-red-700 hover:bg-red-50 hover:text-red-800',
          fillHeight ? 'min-h-0 flex-1' : '',
        ].join(' ')}
      >
        Game Over
      </Button>
    </div>
  );
}
