'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { useRouter } from 'next/navigation';
import { Player } from '../../types';

type Props = {
  selectedPlayer: Player | null;
};

export default function InviteToPlay({ selectedPlayer }: Props) {
  const { logout, loginAsPlayer } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = selectedPlayer !== null;

  const handlePlayNow = () => {
    if (!selectedPlayer) return;
    logout();
    loginAsPlayer(selectedPlayer);
    router.push('/select_game');
  };

  return (
    <>
      <button
        onClick={() => isActive && setIsOpen(true)}
        disabled={!isActive}
        className={`w-full p-2 rounded transition-colors ${
          isActive
            ? 'bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
        }`}
      >
        Invite to Play
      </button>

      {isOpen && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">Invite {selectedPlayer.playerName} to Play</h2>
            <div className="space-y-3">
              <button
                onClick={handlePlayNow}
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                Play Now
              </button>
              <button
                disabled
                className="w-full bg-gray-200 text-gray-400 p-2 rounded cursor-not-allowed opacity-50"
              >
                Create Play Button
              </button>
              <button
                disabled
                className="w-full bg-gray-200 text-gray-400 p-2 rounded cursor-not-allowed opacity-50"
              >
                Send Invite to Play
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
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