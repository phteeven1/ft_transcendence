'use client';
/*
Simple confirmation modal asking the player if they want to initiate a new game.
waitingFor is always 0 (open lobby, starts after 5 minutes or when force-started).
Players join via the pending game button, and the initiator can force-start at any time.
*/

import { Dialog } from '../../components/ui/dialog';

type Props = {
  gameName: string;
  onCancel: () => void;
  onCreate: () => void;
};

export default function InitiateGameModal({ gameName, onCancel, onCreate }: Props) {
  return (
    <Dialog
      open
      onClose={onCancel}
      title={gameName}
      cancelLabel="Cancel"
      confirmLabel="Start"
      onConfirm={onCreate}
      confirmVariant="accent"
    >
      <p>
        Do you want to start a new session? Others in your group can join before it begins.
      </p>
    </Dialog>
  );
}
