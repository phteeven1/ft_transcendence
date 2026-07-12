'use client';

import { useTranslations } from 'next-intl';
import type { Game, Player } from '@/app/types';
import { Card } from '../../components/ui/card';

interface Props {
  game: Game;
  players: Player[];
  playerId: number;
}

export default function GameInfoColumn({ game, players, playerId }: Props) {
  const tInfo = useTranslations('games.info');
  const tCommon = useTranslations('common');
  const tLobby = useTranslations('games.lobby');
  const initiatorPlayer = players.find((p) => p.id === game.initiatedBy);
  const startedTime = game.startedTime ? new Date(game.startedTime) : null;
  const normalizedGameName = game.name.trim().toLowerCase();
  const displayGameName =
    normalizedGameName === 'word building'
      ? tLobby('wordBuilding')
      : normalizedGameName === 'word soup'
        ? tLobby('wordSoup')
        : game.name;

  return (
    <Card className="clay-panel space-y-3">
      <div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{tInfo('game')}</span>
        <p className="text-foreground font-semibold font-heading text-lg">{displayGameName}</p>
        <p className="text-sm text-muted-foreground">{tInfo('gameNumber', { id: game.id })}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{tInfo('started')}</span>
        <p className="text-foreground font-medium">
          {startedTime ? startedTime.toLocaleTimeString() : tCommon('emDash')}
        </p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{tInfo('initiatedBy')}</span>
        <p className="text-foreground font-medium">
          {initiatorPlayer ? initiatorPlayer.name : tCommon('playerNumber', { id: game.initiatedBy })}
        </p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{tInfo('players')}</span>
        <ul className="mt-1 space-y-1">
          {players.map((p) => (
            <li key={p.id} className="text-foreground font-medium flex items-center gap-2">
              {p.name}
              {p.id === playerId && (
                <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded">
                  {tCommon('you')}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
