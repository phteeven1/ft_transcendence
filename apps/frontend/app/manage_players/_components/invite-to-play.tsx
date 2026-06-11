'use client';
/*
this is the bridge between parent session and player session
only prop is selectedPlayer, with no callback, since it doesn't modify players
Play Now checks for an active backend session token before proceeding.
Create Play Button and Send Invite to Play are not yet implemented.
*/
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { useRouter } from 'next/navigation';
import { ApiError, playersApi } from '@/lib/api';
import { savePlayerSession } from '@/lib/player-session';
import { Player } from '../../types';

type Props = {
  selectedPlayer: Player | null;
};

const SESSION_SHORTCUTS = [30, 45, 60];

export default function InviteToPlay({ selectedPlayer }: Props) {
  const { logout, loginAsPlayer, setSessionExpiresAt, group } = useAuth();
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [startError, setStartError] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState('');

  const isActive = selectedPlayer !== null && !!group?.currentVocabulary;

  const handlePlayNow = async () => {
    if (!selectedPlayer) return;
    setIsChecking(true);
    setHasActiveSession(false);
    try {
      const activeSession = await playersApi.getActiveSession(selectedPlayer.id);
      if (activeSession) {
        setHasActiveSession(true);
        return;
      }
      setIsInviteOpen(false);
      setSessionMinutes('');
      setStartError('');
      setIsSessionOpen(true);
    } catch {
      setHasActiveSession(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSessionStart = async () => {
    if (!selectedPlayer) return;
    const minutes = parseInt(sessionMinutes, 10);
    if (!minutes || minutes <= 0) return;

    setIsStarting(true);
    setStartError('');
    try {
      const session = await playersApi.startSession({
        playerId: selectedPlayer.id,
        minutes,
      });

      savePlayerSession(
        selectedPlayer.id,
        session.token,
        session.expiresAt,
      );

      logout();
      loginAsPlayer(selectedPlayer);
      setSessionExpiresAt(new Date(session.expiresAt).getTime());
      setIsSessionOpen(false);
      router.push('/select_game');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setStartError(
          `${selectedPlayer.name} already has an active session. End it first.`,
        );
      } else {
        setStartError('Could not start session. Please try again.');
      }
    } finally {
      setIsStarting(false);
    }
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

      {isInviteOpen && selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold">
              Invite {selectedPlayer.name} to Play
            </h2>

            {hasActiveSession && (
              <p className="text-red-500 text-sm">
                {selectedPlayer.name} already has an active play session.
                Please end it first using the End Game Session button.
              </p>
            )}

            <div className="space-y-3">
              <button
                onClick={handlePlayNow}
                disabled={isChecking}
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChecking ? 'Checking…' : 'Play Now'}
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
                onClick={() => {
                  setIsInviteOpen(false);
                  setHasActiveSession(false);
                }}
                className="w-full bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

            {startError && (
              <p className="text-red-500 text-sm">{startError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsSessionOpen(false)}
                disabled={isStarting}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSessionStart}
                disabled={
                  isStarting ||
                  !sessionMinutes ||
                  parseInt(sessionMinutes, 10) <= 0
                }
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 rounded transition-colors"
              >
                {isStarting ? 'Starting…' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
