'use client';

import { Dialog } from '../../components/ui/dialog';

type Props = {
  onStay: () => void;
  onLeave: () => void;
  isLeaving: boolean;
};

export default function AbandonPlayModal({ onStay, onLeave, isLeaving }: Props) {
  return (
    <Dialog
      open
      onClose={onStay}
      title="Leave this game?"
      cancelLabel="Stay in game"
      confirmLabel={isLeaving ? 'Leaving…' : 'Leave game'}
      onConfirm={onLeave}
      confirmVariant="destructive"
      confirmDisabled={isLeaving}
    >
      <p className="leading-relaxed">
        If you leave now, your play session will end immediately. You will{' '}
        <strong className="text-foreground">not</strong> be able to join again — a parent must start a new
        session for you.
      </p>
    </Dialog>
  );
}
