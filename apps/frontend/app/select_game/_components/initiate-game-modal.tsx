'use client';
/*
Simple confirmation modal asking the player if they want to initiate a new game.
The backend auto-starts the game once it reaches maxPlayers or once autoStartAt
elapses (both server-driven, see GameDto) — the initiator can also force-start earlier.
Players join via the pending game button.
*/

import { useTranslations } from 'next-intl';
import { Dialog } from '../../components/ui/dialog';

type Props = {
  gameName: string;
  error?: string;
  onCancel: () => void;
  onCreate: () => void;
};

function getLocalizedGameName(
  name: string,
  tLobby: (key: 'wordBuilding' | 'wordSoup') => string,
): string {
  const normalized = name.trim().toLowerCase();
  if (normalized === 'word building') return tLobby('wordBuilding');
  if (normalized === 'word soup') return tLobby('wordSoup');
  return name;
}

export default function InitiateGameModal({ gameName, error, onCancel, onCreate }: Props) {
  const t = useTranslations('games.initiate');
  const tLobby = useTranslations('games.lobby');
  const tCommon = useTranslations('common');

  return (
    <Dialog
      open
      onClose={onCancel}
      title={getLocalizedGameName(gameName, tLobby)}
      cancelLabel={tCommon('cancel')}
      confirmLabel={tCommon('start')}
      onConfirm={onCreate}
      confirmVariant="accent"
    >
      <p>{t('message')}</p>
      {error ? <p className="text-sm text-destructive mt-3">{error}</p> : null}
    </Dialog>
  );
}
