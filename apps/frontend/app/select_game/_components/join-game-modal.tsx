'use client';

/*
shows confirmation modal, asking if player wants to join pending game
It shows game type and how many players/how long time remains before game starts
modal only updates on render, so state goes stale if modal is open for a while
*/

import { Game } from '../../types';
import { Dialog } from '../../components/ui/dialog';

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
    <Dialog
      open
      onClose={onCancel}
      title={`Join ${game.name}?`}
      cancelLabel="Cancel"
      confirmLabel="Join"
      onConfirm={onJoin}
      confirmVariant="primary"
    >
      <p>
        This game will start <span className="font-medium text-foreground">{description}</span>.
        Do you want to join?
      </p>
    </Dialog>
  );
}
