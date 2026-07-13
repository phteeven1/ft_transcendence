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
    <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-gray-300">
      <Button
        onClick={onLeave}
        className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-3 rounded transition-colors"
      >
        Leave Game
      </Button>
      <Button variant="destructive" fullWidth onClick={onGameOver}>
        Game Over
      </Button>
    </div>
  );
}
