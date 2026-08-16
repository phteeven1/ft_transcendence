'use client';

/*
confirmation modal asking the initiating player, after they clicked "Click to Start",
if they want to start without waiting for the requested amount of players/time
*/

import { useTranslations } from 'next-intl';
import { Game } from '../../types';
import { Dialog } from '../../components/ui/dialog';

type Props = {
  game: Game;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
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

export default function ForceStartModal({ game, error, onCancel, onConfirm }: Props) {
  const t = useTranslations('games.forceStart');
  const tLobby = useTranslations('games.lobby');
  const tCommon = useTranslations('common');
  const playerCount = game.players.length;
  const localizedGameName = getLocalizedGameName(game.name, tLobby);

  return (
    <Dialog
      open
      onClose={onCancel}
      title={localizedGameName}
      cancelLabel={tCommon('cancel')}
      confirmLabel={tCommon('start')}
      onConfirm={onConfirm}
      confirmVariant="accent"
    >
      <p>{t('message', { gameName: localizedGameName, count: playerCount })}</p>
      {error ? <p className="text-sm text-destructive mt-3">{error}</p> : null}
    </Dialog>
  );
}
