'use client';

/*
creates button Delete Player and confirmation modal. states are:
- isOpen, controls confirmation modal
- isActive, derived from selectedPlayer, is null or not, used to enable/disable button
*/

import { useState } from 'react';
import { Player } from '../../types';

type Props = {
  selectedPlayer: Player | null;
  onDeleted: (playerId: number) => void;
};

export default function DeletePlayer({ selectedPlayer, onDeleted }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const isActive = selectedPlayer !== null;


  // guards against no selectedPlayer, POSTs to backend with just player id
  // on success, calls onDeleted(selectedPlayer.playerId) to remove player from parent's list
  // on failure, logs error
  const handleDelete = async () => {
    if (!selectedPlayer) return;
    try {
      const res = await fetch('http://localhost:4000/players/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: selectedPlayer.playerId }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      onDeleted(selectedPlayer.playerId);
      setIsOpen(false);
    } catch (error) {
      console.error('deletePlayer failed:', error);
    }
  };

  // renders button and confirmation modal
  return (
    <>
      <button
        onClick={() => isActive && setIsOpen(true)}
        disabled={!isActive}
        className={`w-full p-2 rounded transition-colors ${
          isActive
            ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
        }`}
      >
        Delete Player
      </button>

      {isOpen && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Delete {selectedPlayer.playerName}?</h2>
            <p className="text-gray-600">
              This will permanently delete this player profile. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500 text-white p-2 rounded hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}