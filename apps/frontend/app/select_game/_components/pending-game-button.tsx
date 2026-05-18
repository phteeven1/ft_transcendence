'use client';

/*
This button appears when a new game has been initiated. It will display differently 
to the initiator and all other players. Initiator can opt to force start
before criteria are met, while others can only join and wait.
Button shows how many players have already joined, AND
how many are needed to start game OR
how much time remains until automatic start
*/

import { useEffect, useState } from 'react';
import { Game } from '../../types';

type Props = {
  game: Game;
  currentPlayerId: number;
  onClick: () => void;
  onForceStart: () => void;
};

function formatCountdown(initiatedTime: string, now: number): string {
  const expiresAt = new Date(initiatedTime).getTime() + 5 * 60 * 1000;
  const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function PendingGameButton({ game, currentPlayerId, onClick, onForceStart }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isInitiator = game.initiatedBy === currentPlayerId;
  const alreadyJoined = game.players.includes(currentPlayerId);
  const isCountdown = game.waitingFor === 0;

  // Middle line: "Waiting..." / "Click to Start" / "Click to Join"
  let middleLabel: string;
  if (isInitiator) {
    middleLabel = 'Click to Start';
  } else if (alreadyJoined) {
    middleLabel = 'Waiting...';
  } else {
    middleLabel = 'Click to Join';
  }

  // Bottom line: player count and/or countdown
  let bottomLabel: string;
  if (isCountdown) {
    const countdown = formatCountdown(game.initiatedTime, now);
    bottomLabel = `${game.players.length} player${game.players.length !== 1 ? 's' : ''}, ${countdown}`;
  } else {
    const totalNeeded = game.waitingFor + 1;
    bottomLabel = `${game.players.length}/${totalNeeded} players`;
  }

  // Initiator always gets a clickable button that force-starts.
  // Non-initiator who already joined: disabled.
  // Non-initiator who hasn't joined: clickable to join.
  const isDisabled = !isInitiator && alreadyJoined;

  const handleClick = () => {
    if (isInitiator) {
      onForceStart();
    } else {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        text-white font-medium py-4 px-4 rounded transition-colors text-center
        ${isInitiator
          ? 'bg-amber-500 hover:bg-amber-600'
          : alreadyJoined
            ? 'bg-sky-300 cursor-default'
            : 'bg-sky-500 hover:bg-sky-600'
        }
      `}
    >
      <div className="font-semibold">{game.name}</div>
      <div className="text-xs mt-1 opacity-90">{middleLabel}</div>
      <div className="text-sm font-bold mt-0.5">{bottomLabel}</div>
    </button>
  );
}