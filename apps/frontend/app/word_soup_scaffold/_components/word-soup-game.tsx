'use client';

/*
  Orchestrator for the Word Soup scaffold.
  Responsibilities:
  - Reads gameId and playerId from URL params
  - Fetches game and players on mount
  - Loads visibleCourt from POST /games/:id/initWordSoupCourt
  - Syncs live court/scores via WebSocket (game:state, game:wordGuessed, etc.)
  - Handles word selection, guess submission, and freeze penalties
  - Handles Leave Game and Game Over; redirects on game:finished
*/

import { useEffect, useRef, useState } from 'react';
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
import {
  orderCellsAlongDirection,
  POINTS_PER_WORD,
  WORD_SOUP_BANNER_MS,
  WORD_SOUP_FINAL_WORD_MS,
  WORD_SOUP_TILE_ANIM_MS,
  type WordCelebration,
} from './word-soup-celebration';

// ── Grid dimensions — must match COURT_COLS / COURT_ROWS in game-court.tsx ──
const COURT_COLS = 18;
const COURT_ROWS = 10;
// ─────────────────────────────────────────────────────────────────────────────

// Creates a blank COURT_ROWS × COURT_COLS grid of CourtCells.
function createEmptyCourt(): CourtCell[][] {
  return Array.from({ length: COURT_ROWS }, () =>
    Array.from({ length: COURT_COLS }, () => ({ char: '', revealed: false, highlightedByPlayerId: undefined })),
  );
}
// ─────────────────────────────────────────────────────────────────────────────

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
  const [playerColours, setPlayerColours] = useState<Record<number, string>>({});
  const [playerScores, setPlayerScores] = useState<Record<number, number>>({});
  const [playerWordCounts, setPlayerWordCounts] = useState<Record<number, number>>({});
  const [solutionWords, setSolutionWords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<Array<{ playerId: number; cells: Array<{ row: number; col: number }> ; direction?: [number, number] }>>([]);
  const [selection, setSelection] = useState<Array<{ row: number; col: number }>>([]);
  const [selectionMessage, setSelectionMessage] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);
  const [gameReady, setGameReady] = useState(false);
  const [showWordReveal, setShowWordReveal] = useState(false);
  const [wordRevealIndex, setWordRevealIndex] = useState(0);
  const introRevealStartedRef = useRef(false);
  const introTimersRef = useRef<number[]>([]);
  const celebrationActiveRef = useRef(false);
  const pendingGuessRef = useRef(false);
  const pendingCourtRef = useRef<CourtCell[][] | null>(null);
  const celebrationTimeoutsRef = useRef<number[]>([]);
  const celebrationRunRef = useRef(0);
  const lastProcessedGuessSeqRef = useRef(0);
  const playersRef = useRef<Player[]>([]);
  const solutionWordsRef = useRef(solutionWords);
  const [visibleCourt, setVisibleCourt] = useState<CourtCell[][]>(createEmptyCourt);
  const [wordCelebration, setWordCelebration] = useState<WordCelebration | null>(null);

  const { gameFinished, wordGuessed, wordGuessedSeq, guessResult, serverState, frozenPlayers, freezeNotice, emitSubmitGuess } = useGameSocket(gameId, playerId);
  const wordGuessedRef = useRef(wordGuessed);
  const [freezeSecondsLeft, setFreezeSecondsLeft] = useState(0);
  const [statusBanner, setStatusBanner] = useState('');

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  wordGuessedRef.current = wordGuessed;
  solutionWordsRef.current = solutionWords;

  useEffect(() => {
    if (!serverState) return;
    setPlayerScores(serverState.playerScores);
    setPlayerWordCounts(serverState.playerWordCounts);
    if (celebrationActiveRef.current || pendingGuessRef.current) {
      pendingCourtRef.current = serverState.visibleCourt;
    } else {
      setVisibleCourt(serverState.visibleCourt);
    }
    setSolutionWords((previous) => (previous.length ? previous : serverState.solutionWords));
  }, [serverState]);

  // When the backend tells us the game is finished, send all players home.
  useEffect(() => {
    if (gameFinished) {
      router.push('/select_game');
    }
  }, [gameFinished, router]);

  useEffect(() => {
    return () => {
      celebrationRunRef.current += 1;
      celebrationTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
      celebrationTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (wordGuessedSeq === 0) return;
    if (lastProcessedGuessSeqRef.current === wordGuessedSeq) return;

    const wordGuessed = wordGuessedRef.current;
    if (!wordGuessed) return;

    lastProcessedGuessSeqRef.current = wordGuessedSeq;
    pendingGuessRef.current = false;

    celebrationTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    celebrationTimeoutsRef.current = [];
    celebrationActiveRef.current = true;
    const runId = celebrationRunRef.current + 1;
    celebrationRunRef.current = runId;
    pendingCourtRef.current = wordGuessed.state?.visibleCourt ?? pendingCourtRef.current;

    if (wordGuessed.playerScores) {
      setPlayerScores(wordGuessed.playerScores);
    }
    if (wordGuessed.state?.playerWordCounts) {
      setPlayerWordCounts(wordGuessed.state.playerWordCounts);
    }

    const playerName =
      wordGuessed.playerName ??
      playersRef.current.find((player) => player.id === wordGuessed.playerId)?.name ??
      `Player #${wordGuessed.playerId}`;
    const orderedCells = orderCellsAlongDirection(wordGuessed.cells, wordGuessed.direction);
    const points = wordGuessed.pointsEarned ?? POINTS_PER_WORD;
    const totalWords = wordGuessed.state?.solutionWords.length ?? solutionWordsRef.current.length;
    const solvedCount = wordGuessed.state?.solvedWords.length ?? 0;
    const showFinalWordAfter = totalWords > 1 && solvedCount === totalWords - 1;
    const pendingFoundWord = {
      playerId: wordGuessed.playerId,
      cells: wordGuessed.cells,
      direction: wordGuessed.direction,
    };

    setWordCelebration({
      phase: 'animating',
      playerId: wordGuessed.playerId,
      playerName,
      word: wordGuessed.word,
      points,
      orderedCells,
      activeIndex: 0,
    });
    setSelection([]);
    setSelectionMessage('');
    setIsSubmittingGuess(false);

    const schedule = (callback: () => void, delayMs: number) => {
      const timeoutId = window.setTimeout(() => {
        if (celebrationRunRef.current !== runId) return;
        callback();
      }, delayMs);
      celebrationTimeoutsRef.current.push(timeoutId);
    };

    for (let index = 1; index < orderedCells.length; index += 1) {
      schedule(() => {
        setWordCelebration((current) =>
          current?.phase === 'animating' ? { ...current, activeIndex: index } : current,
        );
      }, index * WORD_SOUP_TILE_ANIM_MS);
    }

    const animationEndMs =
      Math.max(orderedCells.length - 1, 0) * WORD_SOUP_TILE_ANIM_MS + 180;

    schedule(() => {
      setFoundWords((previous) => {
        const alreadyAdded = previous.some(
          (entry) =>
            entry.playerId === pendingFoundWord.playerId &&
            entry.cells.length === pendingFoundWord.cells.length &&
            entry.cells.every(
              (cell, cellIndex) =>
                cell.row === pendingFoundWord.cells[cellIndex].row &&
                cell.col === pendingFoundWord.cells[cellIndex].col,
            ),
        );
        return alreadyAdded ? previous : [...previous, pendingFoundWord];
      });
      if (pendingCourtRef.current) {
        setVisibleCourt(pendingCourtRef.current);
      }
      setWordCelebration({
        phase: 'banner',
        playerId: wordGuessed.playerId,
        playerName,
        word: wordGuessed.word,
        points,
        orderedCells,
        activeIndex: Math.max(orderedCells.length - 1, 0),
      });
    }, animationEndMs);

    schedule(() => {
      if (showFinalWordAfter) {
        setWordCelebration({
          phase: 'final-word',
          playerId: wordGuessed.playerId,
          playerName,
          word: wordGuessed.word,
          points,
          orderedCells,
          activeIndex: Math.max(orderedCells.length - 1, 0),
        });
        schedule(() => {
          setWordCelebration(null);
          celebrationActiveRef.current = false;
          pendingCourtRef.current = null;
        }, WORD_SOUP_FINAL_WORD_MS);
      } else {
        setWordCelebration(null);
        celebrationActiveRef.current = false;
        pendingCourtRef.current = null;
      }
    }, animationEndMs + WORD_SOUP_BANNER_MS);
  }, [wordGuessedSeq]);

  useEffect(() => {
    if (!guessResult) return;
    setSelectionMessage(guessResult.message);
    setIsSubmittingGuess(false);
    if (!guessResult.success) {
      setSelection([]);
      pendingGuessRef.current = false;
      celebrationActiveRef.current = false;
      pendingCourtRef.current = null;
    }
  }, [guessResult]);

  const localFrozenUntil = frozenPlayers[playerId] ?? 0;
  const isLocalPlayerFrozen = localFrozenUntil > Date.now();

  useEffect(() => {
    const updateCountdown = () => {
      const remainingMs = (frozenPlayers[playerId] ?? 0) - Date.now();
      setFreezeSecondsLeft(remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0);
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 250);
    return () => window.clearInterval(intervalId);
  }, [frozenPlayers, playerId]);

  useEffect(() => {
    if (!freezeNotice) return;
    setStatusBanner(freezeNotice.message);
    const timeoutId = window.setTimeout(() => setStatusBanner(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [freezeNotice]);

  const isCelebrating = wordCelebration !== null;

  const handleSelectionStart = (row: number, col: number) => {
    if (!gameReady || isGameOver || isLocalPlayerFrozen || isCelebrating) return;
    setIsSelecting(true);
    setSelection([{ row, col }]);
    setSelectionMessage('');
  };

  const handleSelectionContinue = (row: number, col: number) => {
    if (!gameReady || !isSelecting || isGameOver || isLocalPlayerFrozen || isCelebrating) return;

    setSelection((previous) => {
      if (previous.some((cell) => cell.row === row && cell.col === col)) {
        return previous;
      }

      if (previous.length === 0) {
        return [{ row, col }];
      }

      const current = previous[previous.length - 1];
      const deltaRow = row - current.row;
      const deltaCol = col - current.col;

      if (Math.abs(deltaRow) > 1 || Math.abs(deltaCol) > 1) {
        return previous;
      }

      if (previous.length === 1) {
        return [...previous, { row, col }];
      }

      const previousStep = {
        row: current.row - previous[previous.length - 2].row,
        col: current.col - previous[previous.length - 2].col,
      };

      if (deltaRow === previousStep.row && deltaCol === previousStep.col) {
        return [...previous, { row, col }];
      }

      return previous;
    });
  };

  const handleSelectionEnd = () => {
    setIsSelecting(false);
  };

  const handleSubmitGuess = () => {
    if (!gameReady || isGameOver || isLocalPlayerFrozen || isCelebrating || isSubmittingGuess) return;
    if (selection.length < 2) {
      setSelectionMessage('Select at least two connected letters to submit a guess.');
      return;
    }

    setIsSubmittingGuess(true);
    pendingGuessRef.current = true;
    emitSubmitGuess(selection);
  };

  const handleReturnToLobby = () => {
    router.push('/select_game');
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
      setPlayerScores(
        loadedPlayers.reduce<Record<number, number>>((acc, player) => {
          acc[player.id] = 0;
          return acc;
        }, {}),
      );
      setLoadingGame(false);
    };

    load();
  }, [gameId, playerId, router]);

  // Fetch the visible court from the backend once the game is loaded.
  useEffect(() => {
    if (!game) return;

    let isMounted = true;

    const loadCourt = async () => {
      try {
        const { visibleCourt, playerColours, playerWordCounts, solutionWords } = await wordSoupApi.initCourt(game.id);
        if (isMounted) {
          setVisibleCourt(visibleCourt);
          setPlayerColours(playerColours);
          setPlayerWordCounts(playerWordCounts);
          setSolutionWords(solutionWords);
          setFoundWords([]);
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

  useEffect(() => {
    introRevealStartedRef.current = false;
    lastProcessedGuessSeqRef.current = 0;
    pendingGuessRef.current = false;
    introTimersRef.current.forEach((id) => window.clearTimeout(id));
    introTimersRef.current = [];
  }, [game?.id]);

  useEffect(() => {
    if (!game || solutionWords.length === 0 || introRevealStartedRef.current) {
      return;
    }

    introRevealStartedRef.current = true;
    setGameReady(false);
    setShowWordReveal(true);
    setWordRevealIndex(0);

    let index = 0;

    const revealNextWord = () => {
      if (index >= solutionWords.length) {
        setShowWordReveal(false);
        setGameReady(true);
        return;
      }

      setWordRevealIndex(index);
      index += 1;
      const timeoutId = window.setTimeout(revealNextWord, 1000);
      introTimersRef.current.push(timeoutId);
    };

    revealNextWord();

    return () => {
      introTimersRef.current.forEach((id) => window.clearTimeout(id));
      introTimersRef.current = [];
      introRevealStartedRef.current = false;
    };
  }, [game, solutionWords.length]);

  const wordsFound = foundWords.length;
  const wordsLeft = Math.max(solutionWords.length - wordsFound, 0);
  const isGameOver = Boolean(
    serverState &&
    serverState.solutionWords.length > 0 &&
    serverState.solvedWords.length >= serverState.solutionWords.length,
  );
  const sortedPlayers = [...players].sort((a, b) => (playerScores[b.id] ?? 0) - (playerScores[a.id] ?? 0));

  useEffect(() => {
    if (!isGameOver) return;
    setGameReady(false);
    setShowWordReveal(false);
  }, [isGameOver]);

  // --- Render ---

  if (loadingGame || !game) {
    return (
      <div className="game-shell flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  return (
    <div className="game-shell flex-1 overflow-x-auto">
      <div className="mx-auto max-w-[1600px] px-4 py-4">
        {isGameOver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/80 px-4 backdrop-blur-sm">
            <div className="animate-[fadeIn_250ms_ease-out] w-full max-w-lg rounded-3xl border border-white/20 bg-white p-8 text-center shadow-2xl">
              <div className="mb-4 text-5xl drop-shadow-sm">🎉</div>
              <h2 className="text-3xl font-semibold text-emerald-800">Game complete!</h2>
              <p className="mt-3 text-sm text-gray-600">
                Everyone solved the board. What a brilliant round of Word Soup!
              </p>

              <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                <div className="mb-3 flex justify-center gap-2 text-lg">
                  <span className="animate-bounce [animation-delay:0ms]">✨</span>
                  <span className="animate-bounce [animation-delay:120ms]">🎊</span>
                  <span className="animate-bounce [animation-delay:240ms]">✨</span>
                </div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Final scores</h3>
                <ul className="mt-3 space-y-2 text-left">
                  {sortedPlayers.map((player, index) => (
                    <li key={player.id} className="flex flex-col gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm text-gray-700 shadow-sm sm:flex-row sm:justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600">#{index + 1}</span>
                        <span>{player.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-right text-sm">
                        <span className="font-semibold text-emerald-800">{playerScores[player.id] ?? 0} pts</span>
                        <span className="text-gray-600">{playerWordCounts[player.id] ?? 0} words</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleReturnToLobby}
                className="mt-6 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Return to lobby
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)_minmax(180px,220px)] lg:items-start">

          <GameInfoColumn
            game={game}
            players={players}
            playerId={playerId}
          />

          <div className="flex flex-col gap-3">
            <div className="relative flex">
              <GameCourt
                visibleCourt={visibleCourt}
                playerColours={playerColours}
                selectedCells={selection}
                foundWordGroups={foundWords}
                isLocalPlayerFrozen={isLocalPlayerFrozen}
                freezeSecondsLeft={freezeSecondsLeft}
                wordCelebration={wordCelebration}
                onSelectionStart={handleSelectionStart}
                onSelectionContinue={handleSelectionContinue}
                onSelectionEnd={handleSelectionEnd}
              />
              {(showWordReveal || !gameReady) && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-emerald-950/70 backdrop-blur-sm">
                  <div className="mx-4 max-w-[280px] rounded-2xl border border-white/20 bg-white/95 px-6 py-5 text-center shadow-xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-700">Word Soup</p>
                    <p className="mt-3 text-2xl font-semibold text-emerald-900">{solutionWords[wordRevealIndex] ?? 'Ready!'}</p>
                    <p className="mt-2 text-sm text-gray-600">
                      {solutionWords.length > 0
                        ? `Word ${wordRevealIndex + 1} of ${solutionWords.length}`
                        : 'Get ready...'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-emerald-200 bg-white/90 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Scoreboard</h2>
                <span className="text-xs text-gray-500">Points</span>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg bg-emerald-50/70 p-3 text-center text-sm">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Total</p>
                  <p className="font-semibold text-gray-800">{solutionWords.length}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Found</p>
                  <p className="font-semibold text-gray-800">{wordsFound}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Left</p>
                  <p className="font-semibold text-gray-800">{wordsLeft}</p>
                </div>
              </div>

              <ul className="space-y-2">
                {players.map((player) => (
                  <li key={player.id} className="flex flex-col gap-2 rounded-lg bg-emerald-50/70 px-3 py-2 sm:flex-row sm:justify-between sm:items-center">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 rounded-sm border border-gray-200"
                        style={{ backgroundColor: playerColours[player.id] ?? '#E5E7EB' }}
                      />
                      <span className="text-sm font-medium text-gray-800">{player.name}</span>
                      {player.id === playerId && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <span className="font-semibold">{playerScores[player.id] ?? 0} pts</span>
                      <span>{playerWordCounts[player.id] ?? 0} words</span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-sm text-gray-700">
                <p className="font-semibold text-emerald-800">Rules</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>Select a contiguous word on the grid.</li>
                  <li>Submit your guess to score points.</li>
                  <li>Found words are highlighted in your player colour.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:pt-12">
            {statusBanner && (
              <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-900 shadow-sm">
                {statusBanner}
              </p>
            )}
            <GameControls
              onLeave={handleLeaveClick}
              onGameOver={handleGameOver}
              onSubmitGuess={handleSubmitGuess}
              selectionCount={selection.length}
              isSubmittingGuess={isSubmittingGuess}
              isLocalPlayerFrozen={isLocalPlayerFrozen}
              freezeSecondsLeft={freezeSecondsLeft}
            />
            {selectionMessage && (
              <p className="rounded border border-emerald-200 bg-white/80 px-3 py-2 text-sm text-gray-700">
                {selectionMessage}
              </p>
            )}
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