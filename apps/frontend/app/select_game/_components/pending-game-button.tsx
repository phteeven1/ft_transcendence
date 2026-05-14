'use client';

import { useEffect, useState } from 'react';
import { Game } from '../../types';

type Props = {
  game: Game;
  currentPlayerId: number;
  onClick: () => void;
};

function getStatusLabel(game: Game, now: number): string {
  if (game.waitingFor === 0) {
    const initiatedTime = new Date(game.initiatedTime).getTime();
    const expiresAt = initiatedTime + 5 * 60 * 1000;
    const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${mins}:${String(secs).padStart(2, '0')} left`;
  }

  const totalNeeded = game.waitingFor + 1; // initiator counts as 1
  return `${game.players.length}/${totalNeeded} players`;
}

export default function PendingGameButton({ game, currentPlayerId, onClick }: Props) {
  const [now, setNow] = useState(Date.now());
  const alreadyJoined = game.players.includes(currentPlayerId);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const statusLabel = getStatusLabel(game, now);

  return (
    <button
      onClick={onClick}
      disabled={alreadyJoined}
      className={`
        text-white font-medium py-4 px-4 rounded transition-colors text-center
        ${alreadyJoined
          ? 'bg-sky-300 cursor-default'
          : 'bg-sky-500 hover:bg-sky-600'
        }
      `}
    >
      <div className="font-semibold">{game.name}</div>
      <div className="text-xs mt-1 opacity-90">
        {alreadyJoined ? 'Waiting...' : 'pending...'}
      </div>
      <div className="text-sm font-bold mt-0.5">{statusLabel}</div>
    </button>
  );
}
