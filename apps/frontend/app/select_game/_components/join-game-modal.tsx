'use client';

/*
shows confirmation modal, asking if player wants to join pending game
It shows game type and how many players/how long time remains before game starts
modal only updates on render, so state goes stale if modal is open for a while
*/

import { Game } from '../../types';

type Props = {
  game: Game;
  onCancel: () => void;
  onJoin: () => void;
};

// calculates the human readable string telling the player what they are waiting for
function getJoinDescription(game: Game): string {
  if ((game.waitingFor ?? 0) === 0) {
    const initiatedTime = new Date(game.initiatedTime);
    const expiresAt = new Date(initiatedTime.getTime() + 5 * 60 * 1000);
    const secondsLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `in ${mins}m ${secs}s`;
  }

  const waitingFor = game.waitingFor ?? 0;
  const playersStillNeeded = waitingFor + 1 - game.players.length;
  if (playersStillNeeded <= 0) return 'soon';
  if (playersStillNeeded === 1) return 'when one more player joins';
  return `when ${playersStillNeeded} more players join`;
}

export default function JoinGameModal({ game, onCancel, onJoin }: Props) {
  const description = getJoinDescription(game);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold mb-1">Join {game.name}?</h2>
        <p className="text-sm text-gray-500 mb-6">
          This game will start <span className="font-medium text-gray-700">{description}</span>.
          Do you want to join?
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onJoin}
            className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-medium py-2 rounded transition-colors"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
