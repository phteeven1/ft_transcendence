'use client';

import { useTranslations } from 'next-intl';
import { Dialog } from './ui/dialog';

type ConfirmKind = 'lobby' | 'session';

type Props = {
  kind?: ConfirmKind;
  onStay: () => void;
  onLeave: () => void;
  isLeaving: boolean;
  endsGame?: boolean;
};

/**
 * Confirm dialog for leaving a match (back to lobby) or ending the play session.
 */
export default function AbandonPlayModal({
  kind = 'lobby',
  onStay,
  onLeave,
  isLeaving,
  endsGame = false,
}: Props) {
  const tLobby = useTranslations('games.abandon');
  const tSession = useTranslations('nav.leaveSessionConfirm');
  const tCommon = useTranslations('common');

  const title = kind === 'session' ? tSession('title') : tLobby('title');
  const cancelLabel = kind === 'session' ? tSession('stay') : tLobby('stayInGame');
  const confirmLabel = isLeaving
    ? tCommon('leaving')
    : kind === 'session'
      ? tSession('confirm')
      : tLobby('backToLobby');
  const message =
    kind === 'session'
      ? tSession('message')
      : endsGame
        ? tLobby('lastPlayerMessage')
        : tLobby('message');

  return (
    <Dialog
      open
      onClose={onStay}
      title={title}
      cancelLabel={cancelLabel}
      confirmLabel={confirmLabel}
      onConfirm={onLeave}
      confirmVariant={kind === 'session' ? 'destructive' : 'accent'}
      confirmDisabled={isLeaving}
    >
      <p className="leading-relaxed">{message}</p>
    </Dialog>
  );
}
