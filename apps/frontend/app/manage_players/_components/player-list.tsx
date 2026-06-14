'use client';
/*
display component of player list. no state and makes no fetch
just renders what it receives, and reports clicks back up.
- players: the array to render
- selectedPlayer: used to highlight current player
- isLoading: controls loading state
- onSelected: callback to the parent when player is clicked
*/
import { Player } from '../../types';

type Props = {
  players: Player[];
  selectedPlayer: Player | null;
  isLoading: boolean;
  onSelect: (player: Player) => void;
};

export default function PlayerList({
  players,
  selectedPlayer,
  isLoading,
  onSelect,
}: Props) {
  if (isLoading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (players.length === 0)
    return <p className="text-gray-500 text-sm italic">No players yet.</p>;

  return (
    <ul className="overflow-y-auto max-h-64 md:max-h-full md:h-full border border-emerald-300 rounded">
      {players.map((player) => (
        <li key={player.id} className="border-b border-emerald-300 last:border-b-0">
          <button
            onClick={() => onSelect(player)}
            className={`w-full text-left px-3 py-2 transition-colors ${
              selectedPlayer?.id === player.id
                ? 'bg-blue-50 font-medium text-blue-700'
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            {player.name}
          </button>
        </li>
      ))}
    </ul>
  );
}