'use client';

/*
this is where a player is redirected, when leaving a game, or when the game ends,
if session has run out. It is a dead end that requires new log in by parent
*/

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';

export default function SessionOver() {
  const { player, logoutPlayer } = useAuth();
  const router = useRouter();

  // Sign out the player as soon as we land here
  useEffect(() => {
    logoutPlayer();
  }, []);

  return (
    <div className="min-h-screen bg-emerald-200 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Session over!</h1>
        <p className="text-gray-600 text-sm">
          {player
            ? `Great playing, ${player.name}! Your session has ended.`
            : 'Your session has ended.'}
        </p>
        <p className="text-gray-400 text-xs">
          Ask a parent to start a new session when you want to play again.
        </p>
        {/* Space for game statistics in a future update */}
        <button
          onClick={() => router.push('/register')}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded transition-colors"
        >
          Ok
        </button>
      </div>
    </div>
  );
}
