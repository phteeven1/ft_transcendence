'use client';

import type { Game, Player } from '@/app/types';
import { Card } from '../../components/ui/card';

interface Props {
  game: Game;
  players: Player[];
  playerId: number;
}

export default function GameInfoColumn({ game, players, playerId }: Props) {
  const initiatorPlayer = players.find((p) => p.id === game.initiatedBy);
  const startedTime = game.startedTime ? new Date(game.startedTime) : null;

  return (
    <Card className="clay-panel space-y-3">
      <div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Game</span>
        <p className="text-foreground font-semibold font-heading text-lg">{game.name}</p>
        <p className="text-sm text-muted-foreground">Game #{game.id}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Started</span>
        <p className="text-foreground font-medium">
          {startedTime ? startedTime.toLocaleTimeString() : '—'}
        </p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Initiated by</span>
        <p className="text-foreground font-medium">
          {initiatorPlayer ? initiatorPlayer.name : `Player #${game.initiatedBy}`}
        </p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Players</span>
        <ul className="mt-1 space-y-1">
          {players.map((p) => (
            <li key={p.id} className="text-foreground font-medium flex items-center gap-2">
              {p.name}
              {p.id === playerId && (
                <span className="text-xs bg-primary/15 text-primary px-2 py-0.5 rounded">
                  you
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
