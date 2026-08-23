'use client';

/*
This button appears when a new game has been initiated. It will display differently 
to the initiator and all other players. Initiator can opt to force start
before criteria are met, while others can only join and wait.
Button shows how many players have already joined, AND
how many are needed to start game OR
how much time remains until automatic start
*/

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Game } from '../../types';
import { Button } from '../../components/ui/button';

type Props = {
  game: Game;
  currentPlayerId: number;
  onClick: () => void;
  onForceStart: () => void;
};

let clockSnapshot = Date.now();

function subscribeToClock(onChange: () => void) {
  const interval = setInterval(() => {
    clockSnapshot = Date.now();
    onChange();
  }, 1000);
  return () => clearInterval(interval);
}

function getClockSnapshot() {
  return clockSnapshot;
}

function getServerClockSnapshot() {
  return 0;
}

function formatElapsed(initiatedTime: string, now: number): string {
  const secondsElapsed = Math.max(0, Math.floor((now - new Date(initiatedTime).getTime()) / 1000));
  const mins = Math.floor(secondsElapsed / 60);
  const secs = secondsElapsed % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getLocalizedGameName(
  name: string,
  tLobby: (key: 'wordBuilding' | 'wordSoup') => string,
): string {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'word building') return tLobby('wordBuilding');
  if (normalized === 'word soup') return tLobby('wordSoup');
  return name;
}

export default function PendingGameButton({ game, currentPlayerId, onClick, onForceStart }: Props) {
  const t = useTranslations('games.pending');
  const tLobby = useTranslations('games.lobby');
  const now = useSyncExternalStore(
    subscribeToClock,
    getClockSnapshot,
    getServerClockSnapshot,
  );

  const isInitiator = game.initiatedBy === currentPlayerId;
  const alreadyJoined = game.players.includes(currentPlayerId);

  let middleLabel: string;
  if (isInitiator) {
    middleLabel = t('clickToStart');
  } else if (alreadyJoined) {
    middleLabel = t('waiting');
  } else {
    middleLabel = t('clickToJoin');
  }

  const elapsed = now > 0 ? formatElapsed(game.initiatedTime, now) : '0:00';
  const bottomLabel = t('playerCount', {
    count: game.players.length,
    max: game.maxPlayers,
    elapsed,
  });

  const isDisabled = !isInitiator && alreadyJoined;

  const handleClick = () => {
    if (isInitiator) {
      onForceStart();
    } else {
      onClick();
    }
  };

  const variant = isInitiator ? 'accent' : alreadyJoined ? 'secondary' : 'primary';

  return (
    <Button
      variant={variant}
      size="lg"
      fullWidth
      onClick={handleClick}
      disabled={isDisabled}
      className="clay-tile min-h-[5rem] flex flex-col items-center justify-center gap-1"
    >
      <div className="font-semibold">{getLocalizedGameName(game.name, tLobby)}</div>
      <div className="text-xs mt-1 opacity-90">{middleLabel}</div>
      <div className="text-sm font-bold mt-0.5">{bottomLabel}</div>
    </Button>
  );
}
