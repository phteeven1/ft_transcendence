'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { gamesApi } from '@/lib/api';
import { clearPlayerSession } from '@/lib/player-session';
import { restorePlayerFromSession } from '@/lib/restore-player-session';
import type { WordSoup } from '@/lib/api/games/word-soup/types';

import { useAuth } from '../../context/auth-context';
import { useWordSoupInit } from './use-word-soup-init';
import { useWordSoupIntro } from './use-word-soup-intro';
import { useWordSoupFreeze } from './use-word-soup-freeze';
import { useWordSoupSelection } from './use-word-soup-selection';
import { useWordSoupCelebration } from './use-word-soup-celebration';

type UseWordSoupGameArgs = {
  gameId: number;
  playerId: number;
  socket: {
    gameFinished: boolean;
    wordGuessed: WordSoup.WordGuessedDto | null;
    wordGuessedSeq: number;
    guessResult: { success: boolean; message: string; frozen?: boolean; frozenUntil?: number } | null;
    serverState: WordSoup.GameStateDto | null;
    frozenPlayers: Record<number, number>;
    freezeNotice: WordSoup.FreezeNoticeDto | null;
    leftPlayers: Record<number, string>;
    playerLeftNotice: { playerId: number; playerName: string } | null;
    playerStreaks: Record<number, number>;
    emitSubmitGuess: (cells: Array<{ row: number; col: number }>) => void;
  };
};

export function useWordSoupGame({ gameId, playerId, socket }: UseWordSoupGameArgs) {
  const router = useRouter();
  const { logoutPlayer, loginAsPlayer, setSessionExpiresAt } = useAuth();

  const {
    gameFinished,
    wordGuessed,
    wordGuessedSeq,
    guessResult,
    serverState,
    frozenPlayers: frozenPlayersFromSocket,
    freezeNotice,
    leftPlayers: leftPlayersFromSocket,
    playerLeftNotice,
    playerStreaks: playerStreaksFromSocket,
    emitSubmitGuess,
  } = socket;

  const {
    loading,
    courtReady,
    game,
    players: initialPlayers,
    visibleCourt,
    setVisibleCourt,
    playerColours,
    playerScores,
    setPlayerScores,
    playerWordCounts,
    setPlayerWordCounts,
    playerStreaks,
    setPlayerStreaks,
    leftPlayers: initialLeftPlayers,
    setLeftPlayers,
    solutionWords,
    foundWords,
    setFoundWords,
    hasPlayerSeenIntro,
    isComplete: initIsComplete,
    initialFrozenPlayers,
  } = useWordSoupInit(gameId, playerId);

  const { gameReady, showWordReveal, wordRevealIndex } = useWordSoupIntro({
    gameId,
    playerId,
    courtReady,
    solutionWords,
    hasPlayerSeenIntro,
    skipIntro: initIsComplete || Boolean(game?.isFinished),
  });

  const mergedFrozenPlayers = useMemo(
    () => ({
      ...initialFrozenPlayers,
      ...frozenPlayersFromSocket,
      ...(serverState?.frozenPlayers ?? {}),
    }),
    [initialFrozenPlayers, frozenPlayersFromSocket, serverState?.frozenPlayers],
  );

  const leftPlayers = useMemo(
    () => ({
      ...initialLeftPlayers,
      ...leftPlayersFromSocket,
      ...(serverState?.leftPlayers ?? {}),
    }),
    [initialLeftPlayers, leftPlayersFromSocket, serverState?.leftPlayers],
  );

  const livePlayerStreaks = useMemo(
    () => ({
      ...playerStreaks,
      ...playerStreaksFromSocket,
      ...(serverState?.playerStreaks ?? {}),
    }),
    [playerStreaks, playerStreaksFromSocket, serverState?.playerStreaks],
  );

  const players = useMemo(() => {
    const byId = new Map(initialPlayers.map((player) => [player.id, player]));
    for (const [id, name] of Object.entries(leftPlayers)) {
      const playerIdNum = Number(id);
      if (!byId.has(playerIdNum)) {
        const template = initialPlayers[0];
        byId.set(playerIdNum, {
          ...(template ?? {
            inGroup: 0,
            ofUser: 0,
            passQuestion: '',
            currentGameId: null,
            lastSignout: '',
            sessionExpiresAt: null,
          }),
          id: playerIdNum,
          name,
        });
      }
    }
    return Array.from(byId.values());
  }, [initialPlayers, leftPlayers]);

  const { isLocalPlayerFrozen, freezeSecondsLeft, freezeSecondsByPlayer, statusBanner } =
    useWordSoupFreeze({
      playerId,
      frozenPlayers: mergedFrozenPlayers,
      freezeNotice,
      playerLeftNotice,
    });

  const isGameOver = Boolean(
    game?.isFinished ||
      initIsComplete ||
      serverState?.isComplete ||
      (solutionWords.length > 0 && foundWords.length >= solutionWords.length),
  );

  const pendingGuessRef = useRef(false);
  const clearSelectionRef = useRef<() => void>(() => {});
  const setIsSubmittingGuessRef = useRef<(value: boolean) => void>(() => {});

  const handleCelebrationStart = useCallback(() => {
    pendingGuessRef.current = false;
  }, []);

  const {
    wordCelebration,
    celebrationActiveRef,
    pendingCourtRef,
  } = useWordSoupCelebration({
    wordGuessedSeq,
    wordGuessed,
    players,
    solutionWords,
    setPlayerScores,
    setPlayerWordCounts,
    setFoundWords,
    setVisibleCourt,
    onCelebrationStart: handleCelebrationStart,
    clearSelection: () => clearSelectionRef.current(),
    setIsSubmittingGuess: (value) => setIsSubmittingGuessRef.current(value),
  });

  const isCelebrating = wordCelebration !== null;

  // game:state (isComplete) can arrive before game:wordGuessed, which briefly flashes
  // the game-over overlay. Hold it until the completing celebration has finished —
  // or until a short grace period if no celebration is coming (e.g. rejoin).
  const [allowGameOverOverlay, setAllowGameOverOverlay] = useState(false);
  const sawCompletionCelebrationRef = useRef(false);

  useEffect(() => {
    if (!isGameOver) {
      setAllowGameOverOverlay(false);
      sawCompletionCelebrationRef.current = false;
      return;
    }

    if (isCelebrating) {
      sawCompletionCelebrationRef.current = true;
      setAllowGameOverOverlay(false);
      return;
    }

    if (sawCompletionCelebrationRef.current) {
      setAllowGameOverOverlay(true);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!celebrationActiveRef.current) {
        setAllowGameOverOverlay(true);
      }
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [isGameOver, isCelebrating, celebrationActiveRef]);

  const handleGuessSubmitted = useCallback(() => {
    pendingGuessRef.current = true;
  }, []);

  const handleGuessFailed = useCallback(() => {
    pendingGuessRef.current = false;
    celebrationActiveRef.current = false;
    pendingCourtRef.current = null;
  }, [celebrationActiveRef, pendingCourtRef]);

  const {
    selection,
    selectionMessage,
    isSubmittingGuess,
    handleSelectionStart,
    handleSelectionContinue,
    handleSelectionEnd,
    handleSubmitGuess,
    clearSelection,
    setIsSubmittingGuess,
  } = useWordSoupSelection({
    gameReady,
    isGameOver,
    isLocalPlayerFrozen,
    isCelebrating,
    guessResult,
    emitSubmitGuess,
    onGuessSubmitted: handleGuessSubmitted,
    onGuessFailed: handleGuessFailed,
  });

  clearSelectionRef.current = clearSelection;
  setIsSubmittingGuessRef.current = setIsSubmittingGuess;

  const [isAbandoning, setIsAbandoning] = useState(false);
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  const navigateToLobby = useCallback(async () => {
    await restorePlayerFromSession({ loginAsPlayer, setSessionExpiresAt });
    router.push('/select_game');
  }, [loginAsPlayer, router, setSessionExpiresAt]);

  useEffect(() => {
    if (!serverState) return;

    setPlayerScores(serverState.playerScores);
    setPlayerWordCounts(serverState.playerWordCounts);
    if (serverState.playerStreaks) {
      setPlayerStreaks(serverState.playerStreaks);
    }
    if (serverState.leftPlayers) {
      setLeftPlayers(serverState.leftPlayers);
    }

    // Defer found-word / court updates while the celebration ripple is running,
    // otherwise tiles paint in the player colour immediately and hide the wave.
    if (celebrationActiveRef.current || pendingGuessRef.current) {
      pendingCourtRef.current = serverState.visibleCourt;
      return;
    }

    setFoundWords(serverState.foundWords);
    setVisibleCourt(serverState.visibleCourt);
  }, [
    serverState,
    setFoundWords,
    setPlayerScores,
    setPlayerWordCounts,
    setPlayerStreaks,
    setLeftPlayers,
    setVisibleCourt,
    celebrationActiveRef,
    pendingCourtRef,
  ]);

  useEffect(() => {
    if (!gameFinished) return;
    // Natural completion shows the overlay; Return to Lobby handles navigation.
    if (isGameOver) return;
    void navigateToLobby();
  }, [gameFinished, isGameOver, navigateToLobby]);

  const wordsFound = foundWords.length;
  const wordsLeft = Math.max(solutionWords.length - wordsFound, 0);

  const sortedPlayers = [...players].sort(
    (a, b) => (playerScores[b.id] ?? 0) - (playerScores[a.id] ?? 0),
  );

  const handleLeaveClick = useCallback(() => {
    setShowAbandonModal(true);
  }, []);

  const handleGameOver = useCallback(async () => {
    await gamesApi.finish({ gameId });
  }, [gameId]);

  const handleReturnToLobby = useCallback(async () => {
    try {
      if (!gameFinished && !game?.isFinished) {
        await gamesApi.finish({ gameId });
      }
    } catch (error) {
      console.error('finish failed:', error);
    }
    await navigateToLobby();
  }, [gameId, game?.isFinished, gameFinished, navigateToLobby]);

  const abandonPlay = useCallback(async () => {
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
  }, [gameId, playerId, logoutPlayer, router]);

  const showGameOverOverlay = isGameOver && allowGameOverOverlay && !isCelebrating;

  return {
    game,
    loading,
    players,
    visibleCourt,
    playerColours,
    playerScores,
    playerWordCounts,
    playerStreaks: livePlayerStreaks,
    leftPlayers,
    foundWords,
    selection,
    isLocalPlayerFrozen,
    freezeSecondsLeft,
    freezeSecondsByPlayer,
    frozenPlayers: mergedFrozenPlayers,
    isGameOver,
    showGameOverOverlay,
    selectionMessage,
    statusBanner,
    wordCelebration,
    sortedPlayers,
    solutionWords,
    gameReady,
    showWordReveal,
    wordRevealIndex,
    showAbandonModal,
    isAbandoning,
    wordsFound,
    wordsLeft,
    isSubmittingGuess,
    handleSelectionStart,
    handleSelectionContinue,
    handleSelectionEnd,
    handleSubmitGuess,
    handleLeaveClick,
    handleGameOver,
    handleReturnToLobby,
    abandonPlay,
    closeAbandonModal: () => setShowAbandonModal(false),
  };
}
