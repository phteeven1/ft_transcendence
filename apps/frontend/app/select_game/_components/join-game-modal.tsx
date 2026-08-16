'use client';

/*
shows confirmation modal, asking if player wants to join pending game
It shows game type and how many players/how long time remains before game starts
modal only updates on render, so state goes stale if modal is open for a while
*/

import { useTranslations } from 'next-intl';
import { Game } from '../../types';
import { Dialog } from '../../components/ui/dialog';

type Props = {
  game: Game;
  error?: string;
  onCancel: () => void;
  onJoin: () => void;
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

// calculates the human readable string telling the player what they are waiting for
function getJoinDescription(
  game: Game,
  t: ReturnType<typeof useTranslations<'games.join'>>,
): string {
  if ((game.waitingFor ?? 0) === 0) {
    const initiatedTime = new Date(game.initiatedTime);
    const expiresAt = new Date(initiatedTime.getTime() + 5 * 60 * 1000);
    const secondsLeft = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return t('timingIn', { minutes: mins, seconds: secs });
  }

  const waitingFor = game.waitingFor ?? 0;
  const playersStillNeeded = waitingFor + 1 - game.players.length;
  if (playersStillNeeded <= 0) return t('timingSoon');
  if (playersStillNeeded === 1) return t('timingOneMore');
  return t('timingMorePlayers', { count: playersStillNeeded });
}

export default function JoinGameModal({ game, error, onCancel, onJoin }: Props) {
  const t = useTranslations('games.join');
  const tLobby = useTranslations('games.lobby');
  const tCommon = useTranslations('common');
  const description = getJoinDescription(game, t);

  return (
    <Dialog
      open
      onClose={onCancel}
      title={t('title', { gameName: getLocalizedGameName(game.name, tLobby) })}
      cancelLabel={tCommon('cancel')}
      confirmLabel={tCommon('join')}
      onConfirm={onJoin}
      confirmVariant="primary"
    >
      <p>{t('message', { timing: description })}</p>
      {error ? <p className="text-sm text-destructive mt-3">{error}</p> : null}
    </Dialog>
  );
}
