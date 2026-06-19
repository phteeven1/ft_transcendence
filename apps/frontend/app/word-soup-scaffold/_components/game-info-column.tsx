'use client';

import type { Game, Player } from '../../../types';
import type { VocabularyDto } from '@/lib/api/vocabularies/types';

interface Props {
  game: Game;
  players: Player[];
  playerId: number;
  vocabulary: VocabularyDto | null;
}

export default function GameInfoColumn({ game, players, playerId, vocabulary }: Props) {
  const initiatorPlayer = players.find((p) => p.id === game.initiatedBy);
  const startedTime = game.startedTime ? new Date(game.startedTime) : null;

  return (
    <div className="bg-white rounded-lg shadow p-5 space-y-3">
      <div>
        <span className="text-xs text-gray-400 uppercase tracking-wide">Game</span>
        <p className="text-gray-800 font-semibold text-lg">{game.name}</p>
        <p className="text-sm text-gray-500">Game #{game.id}</p>
      </div>
      <div>
        <span className="text-xs text-gray-400 uppercase tracking-wide">Started</span>
        <p className="text-gray-800 font-medium">
          {startedTime ? startedTime.toLocaleTimeString() : '—'}
        </p>
      </div>
      <div>
        <span className="text-xs text-gray-400 uppercase tracking-wide">Initiated by</span>
        <p className="text-gray-800 font-medium">
          {initiatorPlayer ? initiatorPlayer.name : `Player #${game.initiatedBy}`}
        </p>
      </div>
      <div>
        <span className="text-xs text-gray-400 uppercase tracking-wide">Players</span>
        <ul className="mt-1 space-y-1">
          {players.map((p) => (
            <li key={p.id} className="text-gray-800 font-medium flex items-center gap-2">
              {p.name}
              {p.id === playerId && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                  you
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <span className="text-xs text-gray-400 uppercase tracking-wide">Vocabulary</span>
        <p className="text-gray-800 font-medium">
          {vocabulary ? vocabulary.name : 'No active vocabulary'}
        </p>
        <p className="text-sm text-gray-500">
          {vocabulary ? `${vocabulary.wordCount} words loaded` : 'Waiting for a group vocabulary'}
        </p>
      </div>
    </div>
  );
}
