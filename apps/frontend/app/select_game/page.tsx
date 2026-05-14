'use client';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SelectGame() {
  const { player, logoutPlayer } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!player) {
      router.push('/');
    }
  }, []);

  const handleFinishGame = () => {
    logoutPlayer();
    router.push('/register');
  };

  if (!player) return null;

  // Placeholder layout for selecting games
  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-2 text-center">
          Hi, {player.name}!
        </h1>
        <p className="text-sm text-gray-600 mb-8 text-center">
          Choose a game to play
        </p>
        <div className="space-y-3">
          <p className="text-center text-gray-500 italic">
            Games coming soon...
          </p>
          <button
            onClick={handleFinishGame}
            className="w-full bg-gray-300 text-gray-700 p-2 rounded hover:bg-gray-400"
          >
            Finish Game
          </button>
        </div>
      </div>
    </div>
  );
}
