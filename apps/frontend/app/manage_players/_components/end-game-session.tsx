'use client';
/*
Allows a parent to force-clear a player's active game session.
Only active when a player is selected AND that player has an ongoing session (currentGameId is set).
On confirm, calls clearSession on the backend and reports back via onCleared.
*/
import { useState } from 'react';
import { playersApi } from '@/lib/api';
import { Player } from '../../types';

type Props = {
  selectedPlayer: Player | null;
  onCleared: (updated: Player) => void;
};

export default function EndGameSession({ selectedPlayer, onCleared }: Props) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isActive =
    selectedPlayer !== null && selectedPlayer.currentGameId !== null;

  const handleConfirm = async () => {
    if (!selectedPlayer) return;
    setIsLoading(true);
    setError('');
    try {
      await playersApi.clearSession(selectedPlayer.id);
      const updated = await playersApi.getById(selectedPlayer.id);
      setIsConfirmOpen(false);
      onCleared(updated);
    } catch {
      setError('Failed to end session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => isActive && setIsConfirmOpen(true)}
        disabled={!isActive}
        className={`w-full p-2 rounded transition-colors ${
          isActive
            ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
        }`}
      >
        End Game Session
      </button>

      {isConfirmOpen && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4">
            <h2 className="text-xl font-bold">End Game Session</h2>
            <p className="text-gray-600 text-sm">
              Are you sure you want to end {selectedPlayer.name}&apos;s current
              game session? They will be logged out immediately.
            </p>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsConfirmOpen(false)}
                disabled={isLoading}
                className="flex-1 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-gray-700 font-medium py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium py-2 rounded transition-colors"
              >
                {isLoading ? 'Ending…' : 'End Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}