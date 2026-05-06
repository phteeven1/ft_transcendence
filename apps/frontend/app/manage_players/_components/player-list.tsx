'use client';
import { Player } from '../../types';

type Props = {
  players: Player[];
  selectedPlayer: Player | null;
  isLoading: boolean;
  onSelect: (player: Player) => void;
};

export default function PlayerList({ players, selectedPlayer, isLoading, onSelect }: Props) {
  if (isLoading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (players.length === 0) return <p className="text-gray-500 text-sm italic">No players yet.</p>;

  return (
    <div className="space-y-2">
      {players.map(player => (
        <button
          key={player.playerId}
          onClick={() => onSelect(player)}
          className={`w-full text-left p-3 rounded border-2 transition-colors ${
            selectedPlayer?.playerId === player.playerId
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-blue-300'
          }`}
        >
          {player.playerName}
        </button>
      ))}
    </div>
  );
}