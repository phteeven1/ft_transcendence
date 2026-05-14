'use client';
/*
this is the bridge between parent session and player session
only prop is selectedPlayer, with no callback, since it doesn't modify players
*/
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { useRouter } from 'next/navigation';
import { Player } from '../../types';

type Props = {
  selectedPlayer: Player | null;
};

const SESSION_SHORTCUTS = [30, 45, 60];

export default function InviteToPlay({ selectedPlayer }: Props) {
  const { logout, loginAsPlayer, setSessionTimer } = useAuth();
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [sessionMinutes, setSessionMinutes] = useState('');
  const isActive = selectedPlayer !== null;

  const handlePlayNow = () => {
    setIsInviteOpen(false);
    setSessionMinutes('');
    setIsSessionOpen(true);
  };

  const handleSessionStart = () => {
    if (!selectedPlayer) return;
    const minutes = parseInt(sessionMinutes);
    if (!minutes || minutes <= 0) return;
    logout();
    loginAsPlayer(selectedPlayer);
    setSessionTimer(minutes);
    router.push('/select_game');
  };

  return (
    <>
      <button
        onClick={() => isActive && setIsInviteOpen(true)}
        disabled={!isActive}
        className={`w-full p-2 rounded transition-colors ${
          isActive
            ? 'bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
        }`}
      >
        Invite to Play
      </button>

      {/* Invite modal */}
      {isInviteOpen && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">
              Invite {selectedPlayer.name} to Play
            </h2>
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
                onClick={() => setIsInviteOpen(false)}
                className="w-full bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session length modal */}
      {isSessionOpen && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4">
            <h2 className="text-xl font-bold">
              How long can {selectedPlayer.name} play?
            </h2>

            <div className="space-y-2">
              <label className="text-sm text-gray-600">Minutes</label>
              <input
                type="number"
                min="1"
                value={sessionMinutes}
                onChange={(e) => setSessionMinutes(e.target.value)}
                placeholder="Enter minutes"
                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <div className="flex gap-2 pt-1">
                {SESSION_SHORTCUTS.map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setSessionMinutes(String(mins))}
                    className="w-10 h-10 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-sm font-medium transition-colors"
                  >
                    {mins}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsSessionOpen(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSessionStart}
                disabled={!sessionMinutes || parseInt(sessionMinutes) <= 0}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 rounded transition-colors"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
