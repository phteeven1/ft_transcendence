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

// onSelect passes the whole Player object up to parent
type Props = {
  players: Player[];
  selectedPlayer: Player | null;
  isLoading: boolean;
  onSelect: (player: Player) => void;
};

export default function PlayerList({ players, selectedPlayer, isLoading, onSelect }: Props) {
  if (isLoading) return <p className="text-gray-500 text-sm">Loading...</p>;
  if (players.length === 0) return <p className="text-gray-500 text-sm italic">No players yet.</p>;

  // maps over players and renders each as a button, based on playerId
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