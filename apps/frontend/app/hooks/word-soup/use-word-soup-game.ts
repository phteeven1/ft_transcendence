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
    emitSubmitGuess,
  } = socket;

  const {
    loading,
    courtReady,
    game,
    players,
    visibleCourt,
    setVisibleCourt,
    playerColours,
    playerScores,
    setPlayerScores,
    playerWordCounts,
    setPlayerWordCounts,
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

  const { isLocalPlayerFrozen, freezeSecondsLeft, statusBanner } = useWordSoupFreeze({
    playerId,
    frozenPlayers: mergedFrozenPlayers,
    freezeNotice,
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

    // Defer found-word / court updates while the celebration ripple is running,
    // otherwise tiles paint in the player colour immediately and hide the wave.
    if (celebrationActiveRef.current || pendingGuessRef.current) {
      pendingCourtRef.current = serverState.visibleCourt;
      return;
    }

    setFoundWords(serverState.foundWords);
    setVisibleCourt(serverState.visibleCourt);
  }, [serverState, setFoundWords, setPlayerScores, setPlayerWordCounts, setVisibleCourt, celebrationActiveRef, pendingCourtRef]);

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

  const showGameOverOverlay = isGameOver && !isCelebrating;

  return {
    game,
    loading,
    players,
    visibleCourt,
    playerColours,
    playerScores,
    playerWordCounts,
    foundWords,
    selection,
    isLocalPlayerFrozen,
    freezeSecondsLeft,
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
