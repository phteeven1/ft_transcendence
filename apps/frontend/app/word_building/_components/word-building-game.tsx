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
//   WS    game:finalLetterPlaced → server → all clients → brief celebration banner
//   WS    game:playerLeft → server → all clients → mark that one player as left;
//                        the match keeps running for everyone still in it
//   WS    game:finished → server → all clients still in the room → final scoreboard
//                        (only once every participant has left, or the puzzle is solved;
//                        Return to Lobby on the scoreboard is the only navigation)

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
import { playersApi } from '@/lib/api';
import { gamesApi } from '@/lib/api/games';
import { wordBuildingApi } from '@/lib/api/games/word-building.api';
import GameCourt from './game-court';
import { CourtCell } from './court-tile';
import GameInfoColumn from './game-info-column';
import GameControls from './game-controls';
import AbandonPlayModal from '../../components/abandon-play-modal';
import WordBuildingGameOverOverlay from './word-building-game-over-overlay';
import WordBuildingFinalLetterOverlay from './word-building-final-letter-overlay';
import WordBuildingIntroOverlay from './word-building-intro-overlay';
import WordBuildingRulesInfo from './word-building-rules-info';
import WordBuildingTitle from './word-building-title';
import WordBuildingPlayerRail from './word-building-player-rail';
import TileRack from './tile-rack';
import GameClock from '@/app/components/game-clock';
import type { GameFinishOutcomeDto, GameFinishPlayerOutcomeDto } from '@/lib/api/games/types';
import type { IInitCourtResponse, IGameStatePayload } from '@/lib/api/games/word-building.types';

/** Deterministic player colour palette — cycled by roster index. */
const PLAYER_COLOUR_PALETTE = [
  '#5EEAD4', '#A78BFA', '#FB923C', '#F472B6', '#34D399', '#60A5FA',
];

/**
 * How long the final-letter celebration banner stays up before the final
 * scoreboard takes over. Long enough to read, short enough to stay snappy.
 */
const FINAL_LETTER_CELEBRATION_MS = 3000;

// The initial state is an empty array; the real court arrives from the API
// and replaces it before the board is rendered (loading screen covers this gap).
const EMPTY_COURT: CourtCell[][] = [];

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
  const [showAbandonModal,      setShowAbandonModal]      = useState(false);
  const [isAbandoning,          setIsAbandoning]          = useState(false);
  const [playerNames,           setPlayerNames]           = useState<Map<number, string>>(new Map());
  // Authoritative participant count, from the game record fetched at mount —
  // available well before the async playerNames roster fetch resolves, so
  // this (not playerNames.size) is what should gate solo-vs-multiplayer logic.
  const [rosterPlayerIds,       setRosterPlayerIds]       = useState<number[] | null>(null);
  const [startedTime,          setStartedTime]           = useState<string | null>(null);
  const [loading,              setLoading]               = useState(true);
  const [playerColours,        setPlayerColours]         = useState<Record<number, string>>({});
  const [playerAvatarTiers,    setPlayerAvatarTiers]     = useState<Record<number, number>>({});
  const [playerAvatarAnimals,  setPlayerAvatarAnimals]   = useState<Record<number, number>>({});
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [dragTargetRow, setDragTargetRow] = useState<number | null>(null);
  const [dragTargetCol, setDragTargetCol] = useState<number | null>(null);
  // Intro overlay: shown once on first load, dismissed by the player.
  const [showIntro, setShowIntro] = useState(true);
  // Manual score screen: shown when the player chooses Back to Lobby mid-game.
  const [manuallyShowOverlay, setManuallyShowOverlay] = useState(false);
  const [manualFinishOutcome, setManualFinishOutcome] = useState<GameFinishOutcomeDto | null>(null);

  // ── WebSocket ───────────────────────────────────────────────────────────────
  const {
    gameState, gameFinished, finishOutcome: socketFinishOutcome, emitPlaceLetter,
    cellLocks, emitCellLock, emitCellUnlock, leftPlayers, mergeLeftPlayers,
    finalLetterPlaced, finalLetterPlacedSeq,
  } = useGameSocket(gameId, playerId);

  // ── Final-letter celebration ────────────────────────────────────────────────
  // Holds the game-over scoreboard back for a beat after the puzzle-completing
  // placement so everyone sees who finished it before the transition. Gated on
  // the server-broadcast sequence number (not local timing), so it fires once,
  // in sync, for every client — including the player who placed the letter.
  //
  // Multiplayer-ness is derived from rosterPlayerIds (the authoritative game
  // roster fetched at mount), not playerNames.size — that map is populated by
  // a separate async fetch with no ordering guarantee against the final-letter
  // event, so it can still read 0/1 for a real multiplayer game.
  const [dismissedCelebrationSeq, setDismissedCelebrationSeq] = useState(0);
  const celebrationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMultiplayer = (rosterPlayerIds?.length ?? playerNames.size) > 1;
  const isCelebratingFinalLetter =
    isMultiplayer && finalLetterPlacedSeq > 0 && finalLetterPlacedSeq > dismissedCelebrationSeq;

  useEffect(() => {
    // Solo games have no one else to celebrate in front of — skip the
    // celebration state entirely instead of flashing it for one render.
    if (!isMultiplayer) return;
    if (finalLetterPlacedSeq === 0 || finalLetterPlacedSeq <= dismissedCelebrationSeq) return;
    if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = setTimeout(() => {
      setDismissedCelebrationSeq(finalLetterPlacedSeq);
    }, FINAL_LETTER_CELEBRATION_MS);
    return () => {
      if (celebrationTimerRef.current) clearTimeout(celebrationTimerRef.current);
    };
  }, [finalLetterPlacedSeq, dismissedCelebrationSeq, isMultiplayer]);

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
      const [loadedGame, player] = await Promise.all([
        gamesApi.getById({ gameId }).catch(() => null),
        playersApi.getById(playerId).catch(() => null),
      ]);
      if (cancelled) return;

      // Authoritative, server-side "did I leave this game" check — Player.currentGameId
      // is cleared the moment this player leaves an active match (games.service.leave)
      // and is independent of whether the match itself is still running for others.
      // This is what stops browser Back / refresh / a stale tab from rejoining a game
      // this player already left, even while other players are still actively playing it.
      // `player === null` (fetch failed) fails open so a transient network error doesn't
      // block a legitimately active player.
      const hasLeftThisGame = player != null && player.currentGameId !== gameId;

      if (!loadedGame || loadedGame.isFinished || hasLeftThisGame) {
        await redirectAfterEndedGame();
        return;
      }

      setStartedTime(loadedGame.startedTime ?? null);
      setRosterPlayerIds(loadedGame.players);

      try {
        const data = await wordBuildingApi.initCourt(gameId);
        if (cancelled) return;
        setVisibleCourt(data.visibleCourt);
        setCluesAcross(data.clues.across);
        setCluesDown(data.clues.down);
        mergeLeftPlayers(data.leftPlayers);

        // availableLetters is pre-computed by the backend from the solution grid.
        // trueCourt.char is intentionally empty (solution hidden), so extracting
        // letters from it would always yield nothing — use the backend value directly.
        setAvailableLetters(data.availableLetters);

        setLoading(false);
      } catch {
        if (!cancelled) await redirectAfterEndedGame();
      }
    };

    void load();

    wordBuildingApi.getPlayersForGame(gameId).then((players) => {
      if (cancelled) return;
      const nameMap = new Map<number, string>();
      const colours: Record<number, string> = {};
      const tiers: Record<number, number> = {};
      const animals: Record<number, number> = {};
      players.forEach((p, index) => {
        nameMap.set(p.id, p.name);
        colours[p.id] = PLAYER_COLOUR_PALETTE[index % PLAYER_COLOUR_PALETTE.length];
        tiers[p.id] = p.avatarTier ?? 0;
        animals[p.id] = p.avatarAnimal ?? 0;
      });
      setPlayerNames(nameMap);
      setPlayerColours(colours);
      setPlayerAvatarTiers(tiers);
      setPlayerAvatarAnimals(animals);
    });

    return () => {
      cancelled = true;
    };
  }, [gameId, playerId, router, loginAsPlayer, setSessionExpiresAt, mergeLeftPlayers]);

  // ── React to game:state WS events ─────────────────────────────────────────
  useEffect(() => {
    if (!gameState) return;
    setVisibleCourt(gameState.visibleCourt);
    setScores(gameState.scores);
    setSolved(gameState.solved);
  }, [gameState]);

  // `game:finished` never redirects on its own — win or lose, natural finish or a
  // player leaving, every client renders the final scoreboard overlay below and
  // waits for the player to press "Return to Lobby" (handleReturnToLobby).

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
    const courtCols = visibleCourt[0]?.length ?? 0;
    const courtRows = visibleCourt.length;
    let hasAcross = false;
    let hasDown = false;
    let acrossEmpty = 0;
    let downEmpty = 0;

    // Check across clues
    for (const clue of cluesAcross) {
      // Scan rightward from clue start to find word extent
      let wordEnd = clue.col;
      while (wordEnd < courtCols && visibleCourt[clue.row]?.[wordEnd]?.status !== 'none') {
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
      while (wordEnd < courtRows && visibleCourt[wordEnd]?.[clue.col]?.status !== 'none') {
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

    const courtCols = visibleCourt[0]?.length ?? 0;
    const courtRows = visibleCourt.length;

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
      while (nextCol < courtCols) {
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
      while (nextRow < courtRows) {
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

/**
   * Handles a letter tile drop from the tile rack onto a crossword cell.
   * Sends the placement via WebSocket; the server validates and broadcasts the update.
   * No lock emission needed — drag-to-drop is instantaneous.
   * Returns true when the placement is sent (triggers ant celebration),
   * false when the cell is ineligible (no false celebration).
   */
  const handleCellDrop = useCallback((row: number, col: number, letter: string): boolean => {
    if (solved) return false;
    const cell = visibleCourt[row]?.[col];
    if (!cell || cell.status === 'none' || cell.status === 'correct') return false;
    emitPlaceLetter({ gameId, playerId, row, col, letter });
    return true;
  }, [solved, visibleCourt, gameId, playerId, emitPlaceLetter]);

  /** Tracks which cell the ant is hovering over so GameCourt can highlight it. */
  const handleDragTarget = useCallback((row: number | null, col: number | null) => {
    setDragTargetRow(row);
    setDragTargetCol(col);
  }, []);

  /**
   * Whether this player is the last one still active in the match, purely to
   * pick the right confirmation copy on the Abandon modal ("you'll end the
   * game" vs. "the others keep playing"). Leaving itself is always the same
   * REST call — the backend decides whether the match actually ends.
   */
  const isLastRemaining = useMemo(() => {
    if (playerNames.size === 0) return false;
    const remaining = [...playerNames.keys()].filter(
      (id) => id === playerId || !leftPlayers[id],
    );
    return remaining.length <= 1;
  }, [leftPlayers, playerId, playerNames]);

  /**
   * Builds a score snapshot from current state when no server outcome is available
   * (network failure on the outcome fetch below). Participants come from the player
   * roster — not from who happens to have a score event yet — so a player with no
   * moves still shows up with 0 instead of vanishing from the list.
   */
  const buildFallbackOutcome = useCallback((): GameFinishOutcomeDto => {
    const scoreByPlayer = new Map(scores.map((s) => [s.playerId, s.score]));
    const rosterIds = playerNames.size > 0 ? [...playerNames.keys()] : [...scoreByPlayer.keys()];
    const withScores = rosterIds.map((pid) => ({
      playerId: pid,
      score: scoreByPlayer.get(pid) ?? 0,
    }));
    const maxScore = withScores.reduce((max, p) => Math.max(max, p.score), 0);
    return {
      players: withScores.map(({ playerId: pid, score }) => ({
        playerId: pid,
        playerName: playerNames.get(pid) ?? `Player ${pid}`,
        score,
        xpAwarded: 0,
        isWinner: score === maxScore && maxScore > 0,
      })),
    };
  }, [scores, playerNames]);

  /**
   * Leaves this match and shows this player's own score screen before
   * navigating to the lobby. This is a per-player action — other players are
   * never redirected or otherwise affected by it. The backend only finishes
   * the match once every participant has left (`games.service.leave`); while
   * others are still playing it just marks this player as gone and the match
   * continues for them, so `getFinishOutcome` may still be null here — the
   * fallback below covers that case with this player's last-known scores.
   */
  const leaveToLobby = async () => {
    setIsAbandoning(true);
    try {
      await gamesApi.leave({ gameId, playerId });
      const outcome = await gamesApi.getFinishOutcome({ gameId }).catch(() => null);
      setManualFinishOutcome(outcome ?? buildFallbackOutcome());
      setManuallyShowOverlay(true);
      setShowAbandonModal(false);
    } catch {
      // best-effort — fall back to simple overlay with current scores
      setManualFinishOutcome(buildFallbackOutcome());
      setManuallyShowOverlay(true);
      setShowAbandonModal(false);
    } finally {
      setIsAbandoning(false);
    }
  };

  /**
   * Handles "Return to Lobby" on the score screen.
   * Called from both the natural game-over overlay and the manual leave overlay.
   */
  const handleReturnToLobby = useCallback(() => {
    if (hasLeftForLobbyRef.current) return;
    hasLeftForLobbyRef.current = true;
    const stored = getPlayerSession();
    if (stored && !isSessionExpired(stored.expiresAt)) {
      void restorePlayerFromSession({ loginAsPlayer, setSessionExpiresAt }).then(() => {
        router.push('/select_game');
      });
    } else {
      router.push('/session_over');
    }
  }, [router, loginAsPlayer, setSessionExpiresAt]);

  // ── Derive game-over overlay data ─────────────────────────────────────────
  // Show the scoreboard whenever the game has ended — solved, a player left, or
  // this player chose Back to Lobby — except while the final-letter celebration
  // is still holding the screen; that overlay yields to this one once it ends.
  const showGameOverOverlay = (gameFinished && !isCelebratingFinalLetter) || manuallyShowOverlay;

  // Prefer socket outcome (natural finish), then manually fetched/built outcome.
  const effectiveFinishOutcome = socketFinishOutcome ?? manualFinishOutcome;

  const { gameOverPlayersById, gameOverPlayerOrder } = useMemo(() => {
    if (!effectiveFinishOutcome) return { gameOverPlayersById: {}, gameOverPlayerOrder: [] };
    const byId: Record<number, GameFinishPlayerOutcomeDto> = {};
    for (const p of effectiveFinishOutcome.players) byId[p.playerId] = p;
    const order = [...effectiveFinishOutcome.players]
      .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.playerId - b.playerId))
      .map((p) => p.playerId);
    return { gameOverPlayersById: byId, gameOverPlayerOrder: order };
  }, [effectiveFinishOutcome]);

  const localHostTier   = playerAvatarTiers[playerId]   ?? 0;
  const localHostAnimal = playerAvatarAnimals[playerId] ?? 0;
  const localHostColour = playerColours[playerId];

  const newlyUnlockedTier = useMemo(() => {
    const tier = effectiveFinishOutcome?.players.find((p) => p.playerId === playerId)?.newlyUnlockedTier;
    return typeof tier === 'number' ? tier : null;
  }, [effectiveFinishOutcome, playerId]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="game-shell flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">{t('generating')}</p>
      </div>
    );
  }

  const startedAtMs = startedTime ? new Date(startedTime).getTime() : null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="game-shell relative flex-1 overflow-x-auto outline-none focus:ring-0"
    >
      <div className="mx-auto flex w-full max-w-[1600px] justify-center px-3 py-3 sm:px-4 sm:py-4">
        {/* maxWidth matches Word Soup: sidebar (11.5rem) + gap (1rem) + board cap (600px) = 800px */}
        <div className="w-full" style={{ maxWidth: 'calc(11.5rem + 1rem + 600px)' }}>
          <div className="grid w-full grid-cols-1 items-stretch gap-x-4 gap-y-2 sm:gap-y-2.5 lg:grid-cols-[11.5rem_minmax(0,1fr)]">

            {/* Title — top left */}
            <div className="lg:col-start-1 lg:row-start-1">
              <WordBuildingTitle solved={solved} />
            </div>

            {/* Time & Info — one row, directly under the title. Time stays left,
                Info (plus the direction badge, shown while a cell is selected)
                stays right; the row wraps rather than overflowing if all three
                don't fit on one line in the narrow sidebar column. */}
            <div className="lg:col-start-1 lg:row-start-2">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 rounded-2xl border border-emerald-100 bg-white/80 px-3 py-2 shadow-sm">
                <GameClock
                  startedAtMs={startedAtMs}
                  stopped={solved}
                  label={t('timeLabel')}
                  bare
                />
                <div className="flex shrink-0 items-center gap-2">
                  {selectedRow !== null && selectedCol !== null && (
                    <span className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      {direction === 'across' ? t('directionAcross') : t('directionDown')}
                    </span>
                  )}
                  <WordBuildingRulesInfo />
                </div>
              </div>
            </div>

            {/* Mobile: players (horizontal compact) */}
            <div className="lg:hidden">
              <WordBuildingPlayerRail
                playerNames={playerNames}
                scores={scores}
                localPlayerId={playerId}
                playerColours={playerColours}
                playerAvatarTiers={playerAvatarTiers}
                playerAvatarAnimals={playerAvatarAnimals}
                leftPlayers={leftPlayers}
                orientation="horizontal"
              />
            </div>

            {/* Sidebar — players, clues (clock now lives in the row under the title) */}
            <aside
              className="hidden min-h-0 flex-col gap-3 lg:col-start-1 lg:row-start-3 lg:flex"
              aria-label={t('scoreboardLabel')}
            >
              <div className="min-h-0 flex-1 overflow-y-auto space-y-3">
                <WordBuildingPlayerRail
                  playerNames={playerNames}
                  scores={scores}
                  localPlayerId={playerId}
                  playerColours={playerColours}
                  playerAvatarTiers={playerAvatarTiers}
                  playerAvatarAnimals={playerAvatarAnimals}
                  leftPlayers={leftPlayers}
                  orientation="vertical"
                />
                <GameInfoColumn
                  cluesAcross={cluesAcross}
                  cluesDown={cluesDown}
                />
              </div>
            </aside>

            {/* Board — right column; wb-board-col caps size to avoid vertical overflow */}
            <div className="wb-board-col flex min-w-0 w-full flex-col gap-2 lg:col-start-2 lg:row-start-1 lg:row-span-4">
              <GameCourt
                court={visibleCourt}
                selectedRow={selectedRow}
                selectedCol={selectedCol}
                onCellClick={handleCellClick}
                locks={locksMap}
                myPlayerId={playerId}
                dragTargetRow={dragTargetRow}
                dragTargetCol={dragTargetCol}
              />
              <TileRack letters={availableLetters} disabled={solved} onDrop={handleCellDrop} onDragTarget={handleDragTarget} />
            </div>

            {/* Back to lobby — left, row 4 */}
            <div className="hidden h-full lg:col-start-1 lg:row-start-4 lg:block">
              <GameControls onLeave={() => setShowAbandonModal(true)} />
            </div>

            {/* Mobile: clues + back to lobby (clock + info now live in the row under the title) */}
            <div className="flex flex-col gap-3 lg:hidden">
              <GameInfoColumn
                cluesAcross={cluesAcross}
                cluesDown={cluesDown}
              />
              <GameControls onLeave={() => setShowAbandonModal(true)} />
            </div>

          </div>
        </div>
      </div>

      {/* Abandon modal — leaving only affects this player unless they're the last one active */}
      {showAbandonModal && (
        <AbandonPlayModal
          onStay={() => setShowAbandonModal(false)}
          onLeave={leaveToLobby}
          isLeaving={isAbandoning}
          endsGame={isLastRemaining}
        />
      )}

      {/* Intro overlay — dismissed by the player before first interaction */}
      {showIntro && !showGameOverOverlay && !isCelebratingFinalLetter && (
        <WordBuildingIntroOverlay
          playerName={playerNames.get(playerId) ?? ''}
          hostTier={localHostTier}
          hostAnimal={localHostAnimal}
          hostClothesColor={localHostColour}
          onDismiss={() => setShowIntro(false)}
        />
      )}

      {/* Final-letter celebration — same authoritative event for every client, shown once */}
      {isCelebratingFinalLetter && finalLetterPlaced && !manuallyShowOverlay && (
        <WordBuildingFinalLetterOverlay
          playerName={playerNames.get(finalLetterPlaced.playerId) ?? finalLetterPlaced.playerName}
          hostTier={playerAvatarTiers[finalLetterPlaced.playerId] ?? 0}
          hostAnimal={playerAvatarAnimals[finalLetterPlaced.playerId] ?? 0}
          hostClothesColor={playerColours[finalLetterPlaced.playerId]}
        />
      )}

      {/* Score screen — shown after natural game finish or after Back to Lobby */}
      {showGameOverOverlay && (
        <WordBuildingGameOverOverlay
          playersById={gameOverPlayersById}
          playerOrder={gameOverPlayerOrder}
          playerColours={playerColours}
          localPlayerId={playerId}
          playerAvatarTiers={playerAvatarTiers}
          playerAvatarAnimals={playerAvatarAnimals}
          hostTier={localHostTier}
          hostAnimal={localHostAnimal}
          hostClothesColor={localHostColour}
          newlyUnlockedTier={newlyUnlockedTier}
          onReturnToLobby={handleReturnToLobby}
        />
      )}
    </div>
  );
}
