'use client';

/*
confirmation modal asking the initiating player, after they clicked "Click to Start",
if they want to start without waiting for the requested amount of players/time
*/

import { Game } from '../../types';

type Props = {
  game: Game;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ForceStartModal({ game, onCancel, onConfirm }: Props) {
  const playerCount = game.players.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold mb-1">{game.name}</h2>
        <p className="text-sm text-gray-500 mb-6">
          Do you want to interrupt waiting and start{' '}
          <span className="font-medium text-gray-700">{game.name}</span> with{' '}
          <span className="font-medium text-gray-700">
            {playerCount} player{playerCount !== 1 ? 's' : ''}
          </span>?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 rounded transition-colors"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}