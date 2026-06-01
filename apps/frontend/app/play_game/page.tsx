'use client';

/*
this is a placeholder page for playing a game. The games should be built to fit
in this page. When a player has started a game, the user and the group have been logged out.
That means, if the player quits or returns in any way, they will return to the landing page.
All important data are fetched here, the current player and game. The game has access
to which group it was started in, which gives access to the vocabulary list.
On leaving game or finishing game, player is sent back to /select_game
where new game can be initiated or joined.
Function for fecthing vocabulary needs to be created
Games will use web sockets for multiplayer interactivity. For the time being,
sync is handled by a poll every 3 s. This can be replaced by web sockets later
*/

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { gamesApi, playersApi } from '@/lib/api';
import { Game, Player } from '../types';
import { useSessionGuard } from '../hooks/use-session-guard';

async function loadPlayersByIds(playerIds: number[]): Promise<Player[]> {
  const results = await Promise.all(
    playerIds.map((id) =>
      playersApi.getById(id).catch(() => null),
    ),
  );
  return results.filter((p): p is Player => p !== null);
}

// manages game state and player interactions
export default function PlayGame() {
  const searchParams = useSearchParams();
  const router = useRouter();
  useSessionGuard();

  const gameId = Number(searchParams.get('gameId'));
  const playerId = Number(searchParams.get('playerId'));

  const [game, setGame] = useState<Game | null>(null);  // stores the fetched game data
  const [players, setPlayers] = useState<Player[]>([]); // stores the list of fetched players
  const [loading, setLoading] = useState(true); // tracks whether the data is being loaded

  // guards against no game and no player
  // loads game and players, then sets isLoading to false
  useEffect(() => {
    if (!gameId || !playerId) {
      router.push('/');
      return;
    }
    const load = async () => {
      const loadedGame = await gamesApi.getById(gameId).catch(() => null);
      if (!loadedGame) {
        router.push('/');
        return;
      }
      setGame(loadedGame);
      const loadedPlayers = await loadPlayersByIds(loadedGame.players);
      setPlayers(loadedPlayers);
      setLoading(false);
    };
    load();
  }, []);

  // polling effect. Checks every 3 s for game updates. If game is finished
  // or doesn't exist, it redirects to /select_game
  useEffect(() => {
    if (!gameId) return;
    const interval = setInterval(async () => {
      const updatedGame = await gamesApi.getById(gameId).catch(() => null);
      if (!updatedGame || updatedGame.isFinished) {
        router.push('/select_game');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [gameId, router]);

  // sends POST request to /games/leave that the player is leaving game, 
  // then redirects to /select_game
  const handleLeave = async () => {
    await gamesApi.leave({ gameId, playerId });
    router.push('/select_game');
  };

  // sends a POST request to /games/finish that the game is finished
  // then redirects to /select_game
  const handleGameOver = async () => {
    await gamesApi.finish({ gameId });
    router.push('/select_game');
  };

  // shows loading message while loading
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
