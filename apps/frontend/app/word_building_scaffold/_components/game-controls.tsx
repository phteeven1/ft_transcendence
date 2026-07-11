'use client';

import { Button } from '../../components/ui/button';

interface Props {
  onLeave: () => void;
  onGameOver: () => void;
}

/**
 * Renders the secondary game actions for leaving or ending the match.
 *
 * @param onLeave Callback for opening the abandon-play flow.
 * @param onGameOver Callback for finishing the game from the parent view.
 */
export default function GameControls({ onLeave, onGameOver }: Props) {
  return (
    <div className="flex flex-col gap-3 lg:pt-12">
      <Button variant="primary" fullWidth onClick={onLeave}>
        Leave Game
      </Button>
      <Button variant="destructive" fullWidth onClick={onGameOver}>
        Game Over
      </Button>
    </div>
  );
}
