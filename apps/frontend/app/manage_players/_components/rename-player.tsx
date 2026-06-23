'use client';

/*
renders button and one input field. Three states:
- isOpen, controls modal
- renameName, the new name
- isActive, derived from selectedPlayer !== null
*/

import { useState } from 'react';
import { playersApi } from '@/lib/api';
import { Player } from '../../types';

type Props = {
  selectedPlayer: Player | null;
  onRenamed: (player: Player) => void;
};

export default function RenamePlayer({ selectedPlayer, onRenamed }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [renameName, setRenameName] = useState('');

  const isActive = selectedPlayer !== null;

  // guards against no selectedPlayer and empty input field
  // POSTs playerId and new playerName to backend
  // on success, calls onRenamed(updated) with full updated player from backend
  const handleRename = async () => {
    if (!selectedPlayer || !renameName.trim()) return;
    try {
      const updated = await playersApi.rename({
        playerId: selectedPlayer.id,
        playerName: renameName.trim(),
      });
      onRenamed(updated);
      setIsOpen(false);
      setRenameName('');
    } catch (error) {
      console.error('renamePlayer failed:', error);
    }
  };

  // Rename button is disabled until player is selected
  return (
    <>
      <button
        onClick={() => isActive && setIsOpen(true)}
        disabled={!isActive}
        className={`w-full p-2 rounded transition-colors ${
          isActive
            ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
        }`}
      >
        Rename Player
      </button>

      {isOpen && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Rename {selectedPlayer.name}</h2>
            <input
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="New name"
              autoComplete="new-password"
            />
            <div className="flex gap-3">
              <button
                onClick={handleRename}
                disabled={!renameName.trim()}
                className={`flex-1 p-2 rounded text-white ${
                  renameName.trim()
                    ? 'bg-blue-500 hover:bg-blue-600'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Rename
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setRenameName('');
                }}
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
