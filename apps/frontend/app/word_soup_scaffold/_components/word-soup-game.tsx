'use client';

/*
  Orchestrator for the Word Soup scaffold.
  Responsibilities:
  - Reads gameId and playerId from URL params
  - Fetches game and players on mount
  - Owns trueCourt and visibleCourt state, both populated by the backend
    via POST /games/:id/initCourt (see games.service.ts: initWordSoupCourt)
  - Wires tile clicks: client emits tile:click → server broadcasts game:tileRevealed
    → all clients copy trueCourt[row][col] into visibleCourt[row][col]
  - Handles Leave Game (one player leaves) and Game Over (ends game for all)
  - Redirects to /select_game when backend emits game:finished
*/

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { gamesApi, playersApi, wordSoupApi } from '@/lib/api';
import type { Game, Player } from '../../types';
import { useSessionGuard } from '../../hooks/use-session-guard';
import { useAuth } from '../../context/auth-context';
import { clearPlayerSession } from '@/lib/player-session';
import { useGameSocket } from '../../hooks/use-game-socket';
import GameInfoColumn from './game-info-column';
import GameCourt from './game-court';
import GameControls from './game-controls';
import AbandonPlayModal from './abandon-play-modal';
import type { CourtCell } from './court-tile';

// ── Grid dimensions — must match COURT_COLS / COURT_ROWS in game-court.tsx ──
const COURT_COLS = 18;
const COURT_ROWS = 10;
// ─────────────────────────────────────────────────────────────────────────────

// Creates a blank COURT_ROWS × COURT_COLS grid of CourtCells.
function createEmptyCourt(): CourtCell[][] {
  return Array.from({ length: COURT_ROWS }, () =>
    Array.from({ length: COURT_COLS }, () => ({ char: '' })),
  );
}

async function loadPlayersByIds(playerIds: number[]): Promise<Player[]> {
  const results = await Promise.all(
    playerIds.map((id) => playersApi.getById(id).catch(() => null)),
  );
  return results.filter((p): p is Player => p !== null);
}

export default function WordSoupGame() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { logoutPlayer } = useAuth();
  useSessionGuard();

  const gameId = Number(searchParams.get('gameId'));
  const playerId = Number(searchParams.get('playerId'));

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingGame, setLoadingGame] = useState(true);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);

  // trueCourt: the correct layout, received from the backend on mount.
  // visibleCourt: what players see, updated tile by tile via WebSocket reveals.
  const [trueCourt, setTrueCourt] = useState<CourtCell[][]>(createEmptyCourt);
  const [visibleCourt, setVisibleCourt] = useState<CourtCell[][]>(createEmptyCourt);

  // --- WebSocket ---

  const { revealedTile, gameFinished, emitTileClick } = useGameSocket(gameId, playerId);

  // When the server broadcasts a revealed tile, copy from trueCourt into visibleCourt.
  useEffect(() => {
    if (!revealedTile) return;
    const { row, col } = revealedTile;
    setVisibleCourt((prev) =>
      prev.map((r, rIdx) =>
        r.map((cell, cIdx) => {
          if (rIdx !== row || cIdx !== col) return cell;
          return { ...trueCourt[row][col] };
        }),
      ),
    );
  }, [revealedTile, trueCourt]);

  // When the backend tells us the game is finished, send all players home.
  useEffect(() => {
    if (gameFinished) {
      router.push('/select_game');
    }
  }, [gameFinished, router]);

  // --- Tile click handler ---

  const handleTileClick = (row: number, col: number) => {
    emitTileClick(row, col);
  };

  // --- Data fetching ---

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

  // Fetch both courts from the backend once the game is loaded.
  // The backend runs initWordSoupCourt which populates trueCourt from
  // the group's active vocabulary and fills visibleCourt with placeholder chars.
  // Teammates replace those algorithms in games.service.ts without touching this file.
  useEffect(() => {
    if (!game) return;

    let isMounted = true;

    const loadCourt = async () => {
      try {
        const { trueCourt, visibleCourt } = await wordSoupApi.initCourt(game.id);
        if (isMounted) {
          setTrueCourt(trueCourt);
          setVisibleCourt(visibleCourt);
        }
      } catch (error) {
        console.error('WordSoupGame: failed to init court', error);
      }
    };

    loadCourt();

    return () => {
      isMounted = false;
    };
  }, [game]);

  // --- Game controls ---

  const handleLeaveClick = () => setShowAbandonModal(true);

  const handleGameOver = async () => {
    await gamesApi.finish({ gameId });
    // game:finished is broadcast by the backend to all players,
    // which triggers the gameFinished effect above for everyone simultaneously.
  };

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

  // --- Render ---

  if (loadingGame || !game) {
    return (
      <div className="game-shell min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  return (
    <div className="game-shell min-h-[calc(100vh-4rem)] overflow-x-auto">
      <div className="mx-auto max-w-[1600px] px-4 py-4">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(180px,220px)] lg:items-start">

          <GameInfoColumn
            game={game}
            players={players}
            playerId={playerId}
          />

          <div className="flex">
            <GameCourt
              visibleCourt={visibleCourt}
              onTileClick={handleTileClick}
            />
          </div>

          <GameControls
            onLeave={handleLeaveClick}
            onGameOver={handleGameOver}
          />
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