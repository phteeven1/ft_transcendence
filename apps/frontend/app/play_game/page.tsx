'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Game } from '../types';
import { Player } from '../types';

async function fetchGame(gameId: number): Promise<Game | null> {
  const res = await fetch(`http://localhost:4000/games/${gameId}`);
  if (!res.ok) return null;
  return res.json();
}

async function fetchPlayer(playerId: number): Promise<Player | null> {
  const res = await fetch(`http://localhost:4000/players/${playerId}`);
  if (!res.ok) return null;
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

async function fetchPlayersByIds(playerIds: number[]): Promise<Player[]> {
  const results = await Promise.all(playerIds.map((id) => fetchPlayer(id)));
  return results.filter((p): p is Player => p !== null);
}

export default function PlayGame() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const gameId = Number(searchParams.get('gameId'));
  const playerId = Number(searchParams.get('playerId'));

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId || !playerId) {
      router.push('/');
      return;
    }
    const load = async () => {
      const loadedGame = await fetchGame(gameId);
      if (!loadedGame) {
        router.push('/');
        return;
      }
      setGame(loadedGame);
      const loadedPlayers = await fetchPlayersByIds(loadedGame.players);
      setPlayers(loadedPlayers);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!gameId) return;
    const interval = setInterval(async () => {
      const updatedGame = await fetchGame(gameId);
      if (!updatedGame || updatedGame.isFinished) {
        router.push('/select_game');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [gameId, router]);

  const handleLeave = async () => {
    await fetch('http://localhost:4000/games/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, playerId }),
    });
    router.push('/select_game');
  };

  const handleGameOver = async () => {
    await fetch('http://localhost:4000/games/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId }),
    });
    router.push('/select_game');
  };

  if (loading || !game) {
    return (
      <div className="min-h-screen bg-emerald-200 flex items-center justify-center">
        <p className="text-gray-600">Loading game...</p>
      </div>
    );
  }

  const initiatorPlayer = players.find((p) => p.id === game.initiatedBy);
  const startedTime = game.startedTime ? new Date(game.startedTime) : null;

  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="max-w-md mx-auto p-4">

        <h1 className="text-2xl font-bold mb-1 text-center">{game.name}</h1>
        <p className="text-sm text-gray-500 text-center mb-8">Game #{game.id}</p>

        <div className="bg-white rounded-lg shadow p-5 space-y-3 mb-8">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Started</span>
            <p className="text-gray-800 font-medium">
              {startedTime ? startedTime.toLocaleTimeString() : '—'}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Initiated by</span>
            <p className="text-gray-800 font-medium">
              {initiatorPlayer ? initiatorPlayer.name : `Player #${game.initiatedBy}`}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Players</span>
            <ul className="mt-1 space-y-1">
              {players.map((p) => (
                <li key={p.id} className="text-gray-800 font-medium flex items-center gap-2">
                  {p.name}
                  {p.id === playerId && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                      you
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleLeave}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-3 rounded transition-colors"
          >
            Leave Game
          </button>
          <button
            onClick={handleGameOver}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 rounded transition-colors"
          >
            Game Over
          </button>
        </div>

      </div>
    </div>
  );
}
