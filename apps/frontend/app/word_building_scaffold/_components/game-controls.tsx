'use client';

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
      <button
        onClick={onLeave}
        className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-3 rounded transition-colors"
      >
        Leave Game
      </button>
      <button
        onClick={onGameOver}
        className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded transition-colors"
      >
        Game Over
      </button>
    </div>
  );
}
