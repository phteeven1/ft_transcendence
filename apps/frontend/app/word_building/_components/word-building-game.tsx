'use client';

//
// Orchestrator for the Word Building crossword game.
//
// Data flow:
//   REST  POST /games/:id/initWordBuildingCourt → trueCourt + visibleCourt + clues
//   REST  GET  /games/:id                       → game metadata
//   REST  GET  /games/:id/players               → player names for scoreboard
//   WS    placeLetter  → client → server
//   WS    game:state   → server → all clients → update visibleCourt + scores
//   WS    game:finished → server → redirect all players

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { useSessionGuard } from '../../hooks/use-session-guard';
import { useGameSocket } from '../../hooks/use-game-socket';
import {
  getPlayerSession,
  isSessionExpired,
} from '@/lib/player-session';
import { restorePlayerFromSession } from '@/lib/restore-player-session';
import { gamesApi } from '@/lib/api/games';
import { wordBuildingApi } from '@/lib/api/games/word-building.api';
import GameCourt, { COURT_COLS, COURT_ROWS } from './game-court';
import { CourtCell } from './court-tile';
import GameInfoColumn from './game-info-column';
import GameControls from './game-controls';
import AbandonPlayModal from '../../components/abandon-play-modal';
import TileRack from './tile-rack';
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
  const t = useTranslations('games.wordBuilding');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginAsPlayer, setSessionExpiresAt } = useAuth();
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
  const [direction, setDirection] = useState<'across' | 'down'>('across');

  // ── UI state ────────────────────────────────────────────────────────────────
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [isAbandoning,     setIsAbandoning]     = useState(false);
  const [playerNames,      setPlayerNames]      = useState<Map<number, string>>(new Map());
  const [gameName,         setGameName]         = useState('');
  const [startedTime,      setStartedTime]      = useState<string | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);

  // ── WebSocket ───────────────────────────────────────────────────────────────
  const { gameState, gameFinished, emitPlaceLetter, cellLocks, emitCellLock, emitCellUnlock, leftPlayers } = useGameSocket(gameId, playerId);

  // ── Refs for lock emissions (avoid stale closures) ──────────────────────────
  /** Tracks the cell currently held by this player so unlock can be emitted on navigation. */
  const prevSelectionRef = useRef<{ row: number; col: number } | null>(null);
  /** Up-to-date player name map for lock payloads — updated in sync with playerNames state. */
  const playerNamesRef = useRef<Map<number, string>>(new Map());
  const hasLeftForLobbyRef = useRef(false);
  useEffect(() => { playerNamesRef.current = playerNames; }, [playerNames]);

  // ── Derive locks map from WS payload ────────────────────────────────────────
  /**
   * Active soft locks filtered to non-expired entries.
   * Keyed by "row,col" so GameCourt can look them up per-cell efficiently.
   */
  const locksMap = useMemo(() => {
    const map = new Map<string, { playerName: string; playerId: number }>();
    if (!cellLocks) return map;
    const now = Date.now();
    for (const lock of cellLocks.locks) {
      if (lock.expiresAt > now) {
        map.set(`${lock.row},${lock.col}`, { playerName: lock.playerName, playerId: lock.playerId });
      }
    }
    return map;
  }, [cellLocks]);

  // ── On mount: init court via REST ──────────────────────────────────────────
  useEffect(() => {
    if (!gameId || !playerId) {
      router.push('/');
      return;
    }
    if (hasLeftForLobbyRef.current) return;

    let cancelled = false;

    const redirectAfterEndedGame = async () => {
      if (hasLeftForLobbyRef.current) return;
      hasLeftForLobbyRef.current = true;
      const stored = getPlayerSession();
      if (stored && !isSessionExpired(stored.expiresAt)) {
        await restorePlayerFromSession({ loginAsPlayer, setSessionExpiresAt });
        if (!cancelled) router.replace('/select_game');
        return;
      }
      if (!cancelled) router.replace('/session_over');
    };

    const load = async () => {
      const loadedGame = await gamesApi.getById({ gameId }).catch(() => null);
      if (cancelled) return;

      if (!loadedGame || loadedGame.isFinished) {
        await redirectAfterEndedGame();
        return;
      }

      setGameName(loadedGame.name);
      setStartedTime(loadedGame.startedTime ?? null);

      try {
        const data = await wordBuildingApi.initCourt(gameId);
        if (cancelled) return;
        setVisibleCourt(data.visibleCourt);
        setCluesAcross(data.clues.across);
        setCluesDown(data.clues.down);

        // Extract unique letters from the puzzle vocabulary for the tile rack.
        // Extract as-is from the solution (already normalized/uppercased by backend).
        // This avoids issues like 'ß' → 'SS' expansion that breaks matching.
        const lettersSet = new Set<string>();
        for (const row of data.trueCourt) {
          for (const cell of row) {
            if (cell.char && cell.status !== 'none' && /\p{L}/u.test(cell.char)) {
              lettersSet.add(cell.char);
            }
          }
        }
        // Sort using locale-aware comparison for correct ordering in any language
        const sortedLetters = Array.from(lettersSet).sort((a, b) =>
          a.localeCompare(b),
        );
        setAvailableLetters(sortedLetters);
        setLoading(false);
      } catch {
        if (!cancelled) await redirectAfterEndedGame();
      }
    };

    void load();

    wordBuildingApi.getPlayersForGame(gameId).then((players) => {
      if (cancelled) return;
      const map = new Map<number, string>();
      for (const p of players) map.set(p.id, p.name);
      setPlayerNames(map);
    });

    return () => {
      cancelled = true;
    };
  }, [gameId, playerId, router, loginAsPlayer, setSessionExpiresAt]);
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
    // When the puzzle was solved, let players see the completed board before leaving.
    // When the game was force-ended by a parent (not solved), redirect immediately.
    const delay = solved ? 3000 : 0;
    const t = setTimeout(() => {
      if (hasLeftForLobbyRef.current) return;
      hasLeftForLobbyRef.current = true;
      router.push('/select_game');
    }, delay);
    return () => clearTimeout(t);
  }, [gameFinished, router, solved]);

  /**
   * Determines which word(s) a cell belongs to by scanning from clue start positions.
   * Returns { hasAcross: boolean, hasDown: boolean, acrossEmpty: number, downEmpty: number }
   */
  const analyzeCell = useCallback((row: number, col: number): {
    hasAcross: boolean;
    hasDown: boolean;
    acrossEmpty: number;
    downEmpty: number;
  } => {
    let hasAcross = false;
    let hasDown = false;
    let acrossEmpty = 0;
    let downEmpty = 0;

    // Check across clues
    for (const clue of cluesAcross) {
      // Scan rightward from clue start to find word extent
      let wordEnd = clue.col;
      while (wordEnd < COURT_COLS && visibleCourt[clue.row]?.[wordEnd]?.status !== 'none') {
        wordEnd++;
      }
      
      // Check if current cell is within this word
      if (clue.row === row && col >= clue.col && col < wordEnd) {
        hasAcross = true;
        // Count empty cells in this word
        for (let c = clue.col; c < wordEnd; c++) {
          if (visibleCourt[clue.row][c].status === 'empty') acrossEmpty++;
        }
        break;
      }
    }

    // Check down clues
    for (const clue of cluesDown) {
      // Scan downward from clue start to find word extent
      let wordEnd = clue.row;
      while (wordEnd < COURT_ROWS && visibleCourt[wordEnd]?.[clue.col]?.status !== 'none') {
        wordEnd++;
      }
      
      // Check if current cell is within this word
      if (clue.col === col && row >= clue.row && row < wordEnd) {
        hasDown = true;
        // Count empty cells in this word
        for (let r = clue.row; r < wordEnd; r++) {
          if (visibleCourt[r][clue.col].status === 'empty') downEmpty++;
        }
        break;
      }
    }

    return { hasAcross, hasDown, acrossEmpty, downEmpty };
  }, [visibleCourt, cluesAcross, cluesDown]);

  /**
   * Intelligently determines the best direction for a cell:
   * - If cell is start of only one clue → use that direction
   * - If cell is start of both → prefer the one with more empty cells
   * - If cell is middle of both → prefer the one with more empty cells
   * - If clicking same cell → toggle direction
   * Also emits cell:lock for the new cell and cell:unlock for the previous one.
   */
  const handleCellClick = useCallback((row: number, col: number) => {
    const cell = visibleCourt[row]?.[col];
    if (!cell || cell.status === 'none') return;

    containerRef.current?.focus();
    
    // Toggle direction if clicking the same cell
    if (row === selectedRow && col === selectedCol) {
      setDirection(prev => prev === 'across' ? 'down' : 'across');
      return;
    }

    // Release the previous cell's reservation
    if (prevSelectionRef.current) {
      const { row: pr, col: pc } = prevSelectionRef.current;
      emitCellUnlock(pr, pc);
    }

    // Set new selection
    setSelectedRow(row);
    setSelectedCol(col);
    prevSelectionRef.current = { row, col };

    // Reserve the new cell so other players see the activity indicator
    const myName = playerNamesRef.current.get(playerId) ?? `Player ${playerId}`;
    emitCellLock({ gameId, playerId, playerName: myName, row, col });
    
    // Intelligently determine direction
    const analysis = analyzeCell(row, col);
    
    if (analysis.hasAcross && !analysis.hasDown) {
      // Cell only belongs to across word
      setDirection('across');
    } else if (analysis.hasDown && !analysis.hasAcross) {
      // Cell only belongs to down word
      setDirection('down');
    } else if (analysis.hasAcross && analysis.hasDown) {
      // Intersection cell - prefer the word with more empty cells
      if (analysis.acrossEmpty > analysis.downEmpty) {
        setDirection('across');
      } else if (analysis.downEmpty > analysis.acrossEmpty) {
        setDirection('down');
      }
      // If equal, keep current direction (or default to across if no current)
    }
    // If neither, keep current direction
  }, [visibleCourt, selectedRow, selectedCol, analyzeCell, emitCellUnlock, emitCellLock, gameId, playerId]);

  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Moves the current selection to the next playable cell after a letter is entered.
   * Movement direction depends on the current direction state:
   * - 'across': moves right within the same word
   * - 'down': moves down within the same word
   * Stops at the end of the word (doesn't wrap to next word automatically)
   */
  const advanceSelection = useCallback(() => {
    if (selectedRow === null || selectedCol === null) return;

    const emitLockForNext = (row: number, col: number) => {
      emitCellUnlock(selectedRow, selectedCol);
      const myName = playerNamesRef.current.get(playerId) ?? `Player ${playerId}`;
      emitCellLock({ gameId, playerId, playerName: myName, row, col });
      prevSelectionRef.current = { row, col };
    };
    
    if (direction === 'across') {
      // Move horizontally (right) within the same row
      const nextCol = selectedCol + 1;
      
      // Find next non-black cell in the same row
      while (nextCol < COURT_COLS) {
        const nextCell = visibleCourt[selectedRow]?.[nextCol];
        if (!nextCell || nextCell.status === 'none') {
          // Hit a black square or edge, stop at current position
          break;
        }
        // Found a valid cell
        emitLockForNext(selectedRow, nextCol);
        setSelectedCol(nextCol);
        return;
      }
      // Reached end of row or hit black square, stay at current position
    } else {
      // Move vertically (down) within the same column
      const nextRow = selectedRow + 1;
      
      // Find next non-black cell in the same column
      while (nextRow < COURT_ROWS) {
        const nextCell = visibleCourt[nextRow]?.[selectedCol];
        if (!nextCell || nextCell.status === 'none') {
          // Hit a black square or edge, stop at current position
          break;
        }
        // Found a valid cell
        emitLockForNext(nextRow, selectedCol);
        setSelectedRow(nextRow);
        return;
      }
      // Reached end of column or hit black square, stay at current position
    }
  }, [selectedRow, selectedCol, direction, visibleCourt, emitCellUnlock, emitCellLock, gameId, playerId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedRow === null || selectedCol === null) return;
      if (solved) return;
      
      // Toggle direction with Space or Tab
      if (e.key === ' ' || e.key === 'Tab') {
        e.preventDefault();
        setDirection(prev => prev === 'across' ? 'down' : 'across');
        return;
      }
      
      // Handle letter input
      const key = e.key.normalize('NFC');
      if (key.length !== 1 || !/\p{L}/u.test(key)) return;
      e.preventDefault();
      emitPlaceLetter({ gameId, playerId, row: selectedRow, col: selectedCol, letter: key });
      advanceSelection();
    };

    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [selectedRow, selectedCol, solved, gameId, playerId, emitPlaceLetter, advanceSelection]);

  const isLastRemaining = useMemo(() => {
    if (playerNames.size === 0) return false;
    const remaining = [...playerNames.keys()].filter(
      (id) => id === playerId || !leftPlayers[id],
    );
    return remaining.length <= 1;
  }, [leftPlayers, playerId, playerNames]);

  /**
   * Handles a letter tile drop from the tile rack onto a crossword cell.
   * Sends the placement via WebSocket; the server validates and broadcasts the update.
   * No lock emission needed — drag-to-drop is instantaneous.
   */
  const handleCellDrop = useCallback((row: number, col: number, letter: string) => {
    if (solved) return;
    const cell = visibleCourt[row]?.[col];
    if (!cell || cell.status === 'none' || cell.status === 'correct') return;
    emitPlaceLetter({ gameId, playerId, row, col, letter });
  }, [solved, visibleCourt, gameId, playerId, emitPlaceLetter]);

  /**
   * Leaves this match and returns to the lobby. The play session stays active
   * so the child can join or start another game; remaining players keep playing.
   */
  const leaveToLobby = async () => {
    setIsAbandoning(true);
    try {
      if (isLastRemaining) {
        await gamesApi.finish({ gameId });
        setShowAbandonModal(false);
        return;
      }
      await gamesApi.leave({ gameId, playerId });
      hasLeftForLobbyRef.current = true;
      const stored = getPlayerSession();
      if (stored && !isSessionExpired(stored.expiresAt)) {
        await restorePlayerFromSession({ loginAsPlayer, setSessionExpiresAt });
      }
      setShowAbandonModal(false);
      router.push('/select_game');
    } catch {
      // best-effort
      setShowAbandonModal(false);
    } finally {
      setIsAbandoning(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="game-shell flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">{t('generating')}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="game-shell flex-1 overflow-x-auto outline-none focus:ring-0"
    >
      <div className="mx-auto max-w-[1600px] px-4 py-4">
        <div className="flex items-center gap-4 mb-2">
          <p className="text-xs text-muted-foreground">
            {t('instructions')}
          </p>
          {selectedRow !== null && selectedCol !== null && (
            <span className="text-xs font-semibold font-heading px-2 py-1 rounded clay-panel text-foreground">
              {direction === 'across' ? t('directionAcross') : t('directionDown')}
            </span>
          )}
        </div>
        <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
          {/* Grid */}
          <main className="flex flex-col gap-2 min-w-0 w-full lg:flex-1 lg:max-w-[600px]">
            <GameCourt
              court={visibleCourt}
              selectedRow={selectedRow}
              selectedCol={selectedCol}
              onCellClick={handleCellClick}
              onCellDrop={handleCellDrop}
              locks={locksMap}
              myPlayerId={playerId}
            />
            {/* Tile rack — drag language-specific tiles onto cells as an alternative to keyboard */}
            <TileRack letters={availableLetters} disabled={solved} />
          </main>

          {/* Info panel + controls — sticky on desktop, stacked on mobile */}
          <div className="w-full lg:w-56 lg:shrink-0 flex flex-col lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
            {/* Scrollable clues / scores section */}
            <div className="flex-1 min-h-0 overflow-y-auto">
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
            {/* Controls always visible at bottom — separated from the active gameplay area */}
            <GameControls
              onLeave={() => setShowAbandonModal(true)}
            />
          </div>
        </div>
      </div>

      {/* Abandon modal */}
      {showAbandonModal && (
        <AbandonPlayModal
          onStay={() => setShowAbandonModal(false)}
          onLeave={leaveToLobby}
          isLeaving={isAbandoning}
          endsGame={isLastRemaining}
        />
      )}

      {/* Puzzle-complete overlay — shown as soon as the board is solved */}
      {solved && (
        <div className="clay-modal-overlay fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="clay-modal text-center max-w-sm mx-4">
            <p className="text-5xl mb-3">🎉</p>
            <p className="font-heading text-2xl font-bold text-primary mb-2">{t('puzzleComplete')}</p>
            <p className="text-sm text-muted-foreground">{t('returningToLobby')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
