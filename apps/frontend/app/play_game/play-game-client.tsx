'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { gamesApi, playersApi } from '@/lib/api';
import { Game, Player } from '../types';
import { useSessionGuard } from '../hooks/use-session-guard';
import { useGameExitGuard } from '../hooks/use-game-exit-guard';
import { useAuth } from '../context/auth-context';
import { clearPlayerSession } from '@/lib/player-session';
import AbandonPlayModal from './_components/abandon-play-modal';
import CrosswordBoard from './_components/CrosswordBoard';

async function loadPlayersByIds(playerIds: number[]): Promise<Player[]> {
  const results = await Promise.all(
    playerIds.map((id) =>
      playersApi.getById(id).catch(() => null),
    ),
  );
  return results.filter((p): p is Player => p !== null);
}

export default function PlayGameClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { logoutPlayer } = useAuth();
  useSessionGuard();

  const gameId = Number(searchParams.get('gameId'));
  const playerId = Number(searchParams.get('playerId'));

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);

  const { markIntentionalExit } = useGameExitGuard({
    enabled: !loading && !!game && !!gameId && !!playerId,
    gameId,
    playerId,
    onIntentionalExit: () => {
      clearPlayerSession();
      logoutPlayer();
    },
  });

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
  }, [gameId, playerId, router]);

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

  const abandonPlay = async () => {
    setIsAbandoning(true);
    try {
      await gamesApi.abandonPlay({ gameId, playerId });
    } catch (error) {
      console.error('abandonPlay failed:', error);
    } finally {
      markIntentionalExit();
      setShowAbandonModal(false);
      router.push('/session_over');
    }
  };

  const handleLeaveClick = () => {
    setShowAbandonModal(true);
  };

  const handleGameOver = async () => {
    await gamesApi.finish({ gameId });
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

        {game.name === 'Word Building' && (
          <div className="bg-white rounded-lg shadow p-5 mb-8">
            <CrosswordBoard gameId={gameId} playerId={playerId} />
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleLeaveClick}
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

      {showAbandonModal && (
        <AbandonPlayModal
          onStay={() => setShowAbandonModal(false)}
          onLeave={abandonPlay}
          isLeaving={isAbandoning}
        />
      )}
    </div>
  );
}
