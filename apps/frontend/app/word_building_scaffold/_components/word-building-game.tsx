'use client';

//
// Orchestrator for the Word Building crossword game.
// Replaces the scaffold placeholder.
//
// Data flow:
//   REST  POST /games/:id/initWordBuildingCourt → trueCourt + visibleCourt + clues
//   REST  GET  /games/:id                       → game metadata
//   REST  GET  /games/:id/players               → player names for scoreboard
//   WS    placeLetter  → client → server
//   WS    game:state   → server → all clients → update visibleCourt + scores
//   WS    game:finished → server → redirect all players

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { useSessionGuard } from '../../hooks/use-session-guard';
import { useGameSocket } from '../../hooks/use-game-socket';
import { clearPlayerSession } from '@/lib/player-session';
import { gamesApi } from '@/lib/api/games';
import { wordBuildingApi } from '@/lib/api/games/word-building.api';
import GameCourt, { COURT_COLS, COURT_ROWS } from './game-court';
import { CourtCell } from './court-tile';
import GameInfoColumn from './game-info-column';
import GameControls from './game-controls';
import AbandonPlayModal from './abandon-play-modal';
import type { IInitCourtResponse, IGameStatePayload } from '@/lib/api/games/word-building.types';

/**
 * Creates the default empty crossword board used before the REST payload arrives.
 *
 * @returns An 18x18 board filled with black cells.
 */
const EMPTY_COURT = (): CourtCell[][] =>
  Array.from({ length: COURT_ROWS }, () =>
    Array.from({ length: COURT_COLS }, () => ({ char: '', status: 'none' as const })),
  );

/**
 * Orchestrates the full Word Building play experience: fetches the initial puzzle,
 * listens for websocket updates, handles keyboard placement, and routes the player
 * away when the game ends.
 */
export default function WordBuildingGame() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { logoutPlayer } = useAuth();
  useSessionGuard();

  const gameId   = Number(searchParams.get('gameId'));
  const playerId = Number(searchParams.get('playerId'));

  // ── Grid state ──────────────────────────────────────────────────────────────
  const [visibleCourt, setVisibleCourt] = useState<CourtCell[][]>(EMPTY_COURT);
  const [cluesAcross,  setCluesAcross]  = useState<IInitCourtResponse['clues']['across']>([]);
  const [cluesDown,    setCluesDown]    = useState<IInitCourtResponse['clues']['down']>([]);
  const [scores,       setScores]       = useState<IGameStatePayload['scores']>([]);
  const [solved,       setSolved]       = useState(false);

  // ── Cell selection ──────────────────────────────────────────────────────────
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [isAbandoning,     setIsAbandoning]     = useState(false);
  const [playerNames,      setPlayerNames]      = useState<Map<number, string>>(new Map());
  const [gameName,         setGameName]         = useState('Word Building');
  const [startedTime,      setStartedTime]      = useState<string | null>(null);
  const [loading,          setLoading]          = useState(true);

  // ── WebSocket ───────────────────────────────────────────────────────────────
  const { gameState, gameFinished, emitPlaceLetter } = useGameSocket(gameId, playerId);

  // ── On mount: init court via REST ──────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !playerId) {
      router.push('/');
      return;
    }

    let cancelled = false;

    wordBuildingApi.initCourt(gameId).then((data: IInitCourtResponse) => {
      if (cancelled) return;
      setVisibleCourt(data.visibleCourt);
      setCluesAcross(data.clues.across);
      setCluesDown(data.clues.down);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) router.push('/');
    });

    gamesApi.getById(gameId).then(game => {
      if (cancelled) return;
      setGameName(game.name);
      setStartedTime(game.startedTime ?? null);
    });

    wordBuildingApi.getPlayersForGame(gameId).then(players => {
      if (cancelled) return;
      const map = new Map<number, string>();
      for (const p of players) map.set(p.id, p.name);
      setPlayerNames(map);
    });

    return () => { cancelled = true; };
  }, [gameId, playerId, router]);

  // ── React to game:state WS events ─────────────────────────────────────────
  useEffect(() => {
    if (!gameState) return;
    setVisibleCourt(gameState.visibleCourt);
    setScores(gameState.scores);
    setSolved(gameState.solved);
  }, [gameState]);

  // ── React to game:finished WS event ───────────────────────────────────────
  useEffect(() => {
    if (!gameFinished) return;
    router.push('/select_game');
  }, [gameFinished, router]);

  /**
   * Selects a playable cell so subsequent keyboard input targets the right location.
   *
   * @param row Row of the clicked cell.
   * @param col Column of the clicked cell.
   */
  const handleCellClick = useCallback((row: number, col: number) => {
    const cell = visibleCourt[row]?.[col];
    if (!cell || cell.status === 'none') return;
    setSelectedRow(row);
    setSelectedCol(col);
  }, [visibleCourt]);

  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Moves the current selection to the next playable cell after a letter is entered.
   * This keeps keyboard-driven play flowing across the crossword.
   */
  const advanceSelection = useCallback(() => {
    if (selectedRow === null || selectedCol === null) return;
    const nextCol = selectedCol + 1;
    if (nextCol < COURT_COLS && visibleCourt[selectedRow]?.[nextCol]?.status !== 'none') {
      setSelectedCol(nextCol);
    } else {
      const nextRow = selectedRow + 1;
      if (nextRow < COURT_ROWS) {
        setSelectedRow(nextRow);
        setSelectedCol(0);
      }
    }
  }, [selectedRow, selectedCol, visibleCourt]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedRow === null || selectedCol === null) return;
      if (solved) return;
      const key = e.key.normalize('NFC');
      if (key.length !== 1 || !/\p{L}/u.test(key)) return;
      e.preventDefault();
      emitPlaceLetter({ gameId, playerId, row: selectedRow, col: selectedCol, letter: key });
      advanceSelection();
    };

    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [selectedRow, selectedCol, solved, gameId, playerId, emitPlaceLetter, advanceSelection]);

  /**
   * Ends the game from the parent controls and lets the backend broadcast completion.
   */
  const handleGameOver = async () => {
    await gamesApi.finish({ gameId });
  };

  /**
   * Ends the active play session, clears the local session token, and redirects out.
   * This is the escape path when the child leaves the game intentionally.
   */
  const abandonPlay = async () => {
    setIsAbandoning(true);
    try {
      await gamesApi.abandonPlay({ gameId, playerId });
    } catch {
      // best-effort
    } finally {
      clearPlayerSession();
      logoutPlayer();
      setShowAbandonModal(false);
      router.push('/session_over');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-200 flex items-center justify-center">
        <p className="text-gray-600">Generating crossword…</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="min-h-screen bg-emerald-200 overflow-x-auto outline-none focus:ring-0"
    >
      <div className="mx-auto max-w-[1600px] px-4 py-4">
        <p className="text-xs text-gray-600 mb-2">
          Click a cell, then type a letter. Green = correct · Blue = empty · Red = wrong.
        </p>
        <div className="flex gap-6 items-start">
          {/* Grid */}
          <main className="flex flex-col gap-2">
            <GameCourt
              court={visibleCourt}
              selectedRow={selectedRow}
              selectedCol={selectedCol}
              onCellClick={handleCellClick}
            />
            <GameControls
              onLeave={() => setShowAbandonModal(true)}
              onGameOver={handleGameOver}
            />
          </main>

          {/* Info panel */}
          <GameInfoColumn
            gameName={gameName}
            startedTime={startedTime}
            playerNames={playerNames}
            scores={scores}
            cluesAcross={cluesAcross}
            cluesDown={cluesDown}
            solved={solved}
          />
        </div>
      </div>

      {/* Abandon modal */}
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
