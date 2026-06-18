'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { gamesApi, groupsApi, playersApi, vocabulariesApi } from '@/lib/api';
import type { Game, Player } from '../../types';
import type { VocabularyDto } from '@/lib/api/vocabularies/types';
import { useSessionGuard } from '../../hooks/use-session-guard';
import { useAuth } from '../../context/auth-context';
import { clearPlayerSession } from '@/lib/player-session';
import AbandonPlayModal from './abandon-play-modal';

const COURT_TILE_COUNT = 16;
const COURT_TILE_GAP = 4;
const COURT_MAX_WIDTH = 895;

type CourtTile = {
  rowIndex: number;
  colIndex: number;
  char: string;
};

function createInitialCourtGrid(): CourtTile[][] {
  return Array.from({ length: COURT_TILE_COUNT }, (_, rowIndex) =>
    Array.from({ length: COURT_TILE_COUNT }, (_, colIndex) => ({
      rowIndex,
      colIndex,
      char: 'A',
    })),
  );
}

const courtStyle = {
  ['--tile-size' as string]: `calc((100% - ${(COURT_TILE_COUNT - 1) * COURT_TILE_GAP}px) / ${COURT_TILE_COUNT + 1})`,
} as CSSProperties;

async function loadPlayersByIds(playerIds: number[]): Promise<Player[]> {
  const results = await Promise.all(
    playerIds.map((id) => playersApi.getById(id).catch(() => null)),
  );
  return results.filter((player): player is Player => player !== null);
}

function CurrentGameColumn({
  game,
  players,
  playerId,
  vocabulary,
}: {
  game: Game;
  players: Player[];
  playerId: number;
  vocabulary: VocabularyDto | null;
}) {
  const initiatorPlayer = players.find(
    (participant) => participant.id === game.initiatedBy,
  );
  const startedTime = game.startedTime ? new Date(game.startedTime) : null;

  return (
    <div className="bg-white rounded-lg shadow p-5 space-y-3">
      <div>
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          Game
        </span>
        <p className="text-gray-800 font-semibold text-lg">{game.name}</p>
        <p className="text-sm text-gray-500">Game #{game.id}</p>
      </div>
      <div>
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          Started
        </span>
        <p className="text-gray-800 font-medium">
          {startedTime ? startedTime.toLocaleTimeString() : '—'}
        </p>
      </div>
      <div>
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          Initiated by
        </span>
        <p className="text-gray-800 font-medium">
          {initiatorPlayer
            ? initiatorPlayer.name
            : `Player #${game.initiatedBy}`}
        </p>
      </div>
      <div>
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          Players
        </span>
        <ul className="mt-1 space-y-1">
          {players.map((participant) => (
            <li
              key={participant.id}
              className="text-gray-800 font-medium flex items-center gap-2"
            >
              {participant.name}
              {participant.id === playerId && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                  you
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          Vocabulary
        </span>
        <p className="text-gray-800 font-medium">
          {vocabulary ? vocabulary.name : 'No active vocabulary'}
        </p>
        <p className="text-sm text-gray-500">
          {vocabulary
            ? `${vocabulary.wordCount} words loaded`
            : 'Waiting for a group vocabulary'}
        </p>
      </div>
    </div>
  );
}

function CourtTileCell({ tile }: { tile: CourtTile }) {
  return (
    <button
      type="button"
      data-row={tile.rowIndex}
      data-col={tile.colIndex}
      title={`Row ${tile.rowIndex + 1}, Column ${tile.colIndex + 1}`}
      className="flex aspect-square h-full w-full items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-900 font-bold leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.15)] transition-transform hover:scale-[1.02]"
      style={{
        fontSize: 'clamp(0.8rem, calc(var(--tile-size) * 0.42), 1.5rem)',
      }}
    >
      {tile.char}
    </button>
  );
}

export default function WordBuildingPlaceholderClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { logoutPlayer } = useAuth();
  useSessionGuard();

  const gameId = Number(searchParams.get('gameId'));
  const playerId = Number(searchParams.get('playerId'));

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyDto | null>(null);
  const [courtGrid, setCourtGrid] = useState<CourtTile[][]>(() =>
    createInitialCourtGrid(),
  );
  const [loadingGame, setLoadingGame] = useState(true);
  const [loadingVocabulary, setLoadingVocabulary] = useState(true);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);

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
      setLoadingGame(false);
    };

    load();
  }, [gameId, playerId, router]);

  useEffect(() => {
    if (!game) return;

    let isMounted = true;

    const loadVocabulary = async () => {
      setLoadingVocabulary(true);
      try {
        const freshGroup = await groupsApi.getById(game.inGroup);
        if (!freshGroup.currentVocabulary) {
          if (isMounted) {
            setVocabulary(null);
          }
          return;
        }

        const loadedVocabulary = await vocabulariesApi.getById(
          freshGroup.currentVocabulary,
        );
        if (isMounted) {
          setVocabulary(loadedVocabulary);
        }
      } catch (error) {
        console.error(
          'WordBuildingPlaceholderClient: failed to load vocabulary',
          error,
        );
        if (isMounted) {
          setVocabulary(null);
        }
      } finally {
        if (isMounted) {
          setLoadingVocabulary(false);
        }
      }
    };

    loadVocabulary();

    return () => {
      isMounted = false;
    };
  }, [game]);

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
      clearPlayerSession();
      logoutPlayer();
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

  if (loadingGame || !game || loadingVocabulary) {
    return (
      <div className="min-h-screen bg-emerald-200 flex items-center justify-center">
        <p className="text-gray-600">Loading game...</p>
      </div>
    );
  }

  const gameColumn = (
    <CurrentGameColumn
      game={game}
      players={players}
      playerId={playerId}
      vocabulary={vocabulary}
    />
  );

  const setCourtCell = (rowIndex: number, colIndex: number, char: string) => {
    setCourtGrid((previousGrid) =>
      previousGrid.map((row, currentRowIndex) =>
        row.map((tile, currentColIndex) =>
          currentRowIndex === rowIndex && currentColIndex === colIndex
            ? { ...tile, char }
            : tile,
        ),
      ),
    );
  };

  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="mx-auto max-w-[1600px] px-4 py-4">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(180px,220px)] lg:items-start">
          <div className="flex flex-col gap-4">
            {gameColumn}
            <div className="bg-white rounded-lg shadow p-5 space-y-3 text-sm text-gray-700">
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  Court
                </span>
                <p className="text-gray-800 font-medium">16 x 16 tiles</p>
                <p className="text-gray-500">
                  Every cell starts as A and can later be filled by row and
                  column.
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-400 uppercase tracking-wide">
                  Grid data
                </span>
                <p className="text-gray-800 font-medium">
                  {courtGrid.length} rows x {courtGrid[0]?.length ?? 0} columns
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:justify-start">
            <div
              className="rounded-2xl bg-white shadow-xl overflow-hidden"
              style={{
                ...courtStyle,
                width: `min(${COURT_MAX_WIDTH}px, calc(100vw - 2rem), calc(100dvh - 12rem))`,
                height: `min(${COURT_MAX_WIDTH}px, calc(100vw - 2rem), calc(100dvh - 12rem))`,
              }}
            >
              <div
                className="grid h-full w-full"
                style={{
                  padding: 'calc(var(--tile-size) / 2)',
                  gap: `${COURT_TILE_GAP}px`,
                  gridTemplateColumns: `repeat(${COURT_TILE_COUNT}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${COURT_TILE_COUNT}, minmax(0, 1fr))`,
                  gridAutoFlow: 'row',
                }}
              >
                {courtGrid.map((row, rowIndex) =>
                  row.map((tile, colIndex) => (
                    <CourtTileCell
                      key={`${rowIndex}-${colIndex}`}
                      tile={tile}
                    />
                  )),
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:pt-12">
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
    </div>
  );
}
