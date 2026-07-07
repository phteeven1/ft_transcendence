'use client';

/*
confirmation modal asking the initiating player, after they clicked "Click to Start",
if they want to start without waiting for the requested amount of players/time
*/

import { Game } from '../../types';
import { Dialog } from '../../components/ui/dialog';

type Props = {
  game: Game;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ForceStartModal({ game, onCancel, onConfirm }: Props) {
  const playerCount = game.players.length;

  return (
    <Dialog
      open
      onClose={onCancel}
      title={game.name}
      cancelLabel="Cancel"
      confirmLabel="Start"
      onConfirm={onConfirm}
      confirmVariant="accent"
    >
      <p>
        Do you want to interrupt waiting and start{' '}
        <span className="font-medium text-foreground">{game.name}</span> with{' '}
        <span className="font-medium text-foreground">
          {playerCount} player{playerCount !== 1 ? 's' : ''}
        </span>
        ?
      </p>
    </Dialog>
  );
}
