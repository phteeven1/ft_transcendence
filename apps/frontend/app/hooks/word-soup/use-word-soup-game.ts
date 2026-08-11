'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { gamesApi } from '@/lib/api';
import type { GameFinishOutcomeDto } from '@/lib/api/games/types';
import { clearPlayerSession } from '@/lib/player-session';
import { restorePlayerFromSession } from '@/lib/restore-player-session';
import type {
  WordSoupWordGuessedDto,
  WordSoupGuessResultDto,
  WordSoupDto,
  WordSoupFreezeNoticeDto,
 } from '@/lib/api/games/word-soup/types';

import { useAuth } from '../../context/auth-context';
import { useWordSoupInit } from './use-word-soup-init';
import { useWordSoupIntro } from './use-word-soup-intro';
import { useWordSoupFreeze } from './use-word-soup-freeze';
import { useWordSoupSelection } from './use-word-soup-selection';
import { useWordSoupCelebration } from './use-word-soup-celebration';
import { useWordSoupEventBanner } from './use-word-soup-event-banner';
import type { WordFoundCelebrationResult } from './use-word-soup-celebration';
import {
  useWordSoupEventBridge,
  useWordSoupGameOverOverlay,
  useWordSoupScorePopup,
} from './use-word-soup-ui-effects';
import { useWordSoupGameOver } from './use-word-soup-game-over';
import { buildFallbackFinishOutcome } from './word-soup-game-over.helpers';

type UseWordSoupGameArgs = {
  gameId: number;
  playerId: number;
  socket: {
    gameFinished: boolean;
    finishOutcome: GameFinishOutcomeDto | null;
    isConnected: boolean;
    wordGuessed: WordSoupWordGuessedDto | null;
    wordGuessedSeq: number;
    guessResult: WordSoupGuessResultDto | null;
    serverState: WordSoupDto | null;
    frozenPlayers: Record<number, number>;
    freezeNotice: WordSoupFreezeNoticeDto | null;
    leftPlayers: Record<number, string>;
    playerLeftNotice: { playerId: number; playerName: string } | null;
    playerStreaks: Record<number, number>;
    emitSubmitGuess: (cells: Array<{ row: number; col: number }>) => void;
  };
};

export function useWordSoupGame({ gameId, playerId, socket }: UseWordSoupGameArgs) {
  const router = useRouter();
  const { logoutPlayer, loginAsPlayer, setSessionExpiresAt } = useAuth();
  const tGuess = useTranslations('games.wordSoup.guess');

  const {
    gameFinished,
    finishOutcome: finishOutcomeFromSocket,
    isConnected,
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
    courtInitError,
    retryInitCourt,
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
    introStartedAt,
    playStartedAt,
    isComplete: initIsComplete,
    initialFrozenPlayers,
  } = useWordSoupInit(gameId, playerId);

  const {
    gameReady,
    showIntro,
    phase: introPhase,
    bubbleText: introBubbleText,
    bubbleVisible: introBubbleVisible,
    wordRevealIndex,
    countdownValue: introCountdownValue,
    totalWords: introTotalWords,
  } = useWordSoupIntro({
    gameId,
    playerId,
    courtReady,
    solutionWords,
    hasPlayerSeenIntro,
    introStartedAt,
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
      ...(serverState?.playerStreaks ?? {}),
      // Socket freeze/unfreeze must win over a stale last game:state snapshot.
      ...playerStreaksFromSocket,
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

  const {
    isLocalPlayerFrozen,
    freezeSecondsLeft,
    freezeSecondsByPlayer,
    latestFreezeNotice,
    latestPlayerLeft,
  } = useWordSoupFreeze({
    playerId,
    frozenPlayers: mergedFrozenPlayers,
    freezeNotice,
    playerLeftNotice,
  });

  const { eventBanner, eventBannerPhase, pushEvent } = useWordSoupEventBanner();
  const { scorePopup, showScorePopup } = useWordSoupScorePopup();

  const isGameOver = Boolean(
    gameFinished ||
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

  const handleWordFound = useCallback(
    (result: WordFoundCelebrationResult) => {
      const colour = playerColours[result.playerId] ?? '#10B981';
      pushEvent({
        kind: 'word-found',
        headline: `${result.playerName} found ${result.word}`,
        clothesColor: colour,
      });
      if (result.isPenultimate) {
        pushEvent({
          kind: 'final-word',
          headline: 'Last word!',
          clothesColor: '#F59E0B',
        });
      }
    },
    [playerColours, pushEvent],
  );

  const handleScoreAwarded = useCallback(
    (result: { playerId: number; points: number }) => {
      showScorePopup(result.playerId, result.points);
    },
    [showScorePopup],
  );

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
    onScoreAwarded: handleScoreAwarded,
    onWordFound: handleWordFound,
    clearSelection: () => clearSelectionRef.current(),
    setIsSubmittingGuess: (value) => setIsSubmittingGuessRef.current(value),
  });

  const isCelebrating = wordCelebration !== null;

  useWordSoupEventBridge({
    playerId,
    latestFreezeNotice,
    latestPlayerLeft,
    playerColours,
    pushEvent,
  });

  const startGameOverSequence = useWordSoupGameOverOverlay(
    isGameOver,
    isCelebrating,
    celebrationActiveRef,
  );

  const [finishOutcomeFromApi, setFinishOutcomeFromApi] =
    useState<GameFinishOutcomeDto | null>(null);

  useEffect(() => {
    if (!startGameOverSequence) {
      setFinishOutcomeFromApi(null);
      return;
    }
    if (finishOutcomeFromSocket || finishOutcomeFromApi) return;

    let cancelled = false;
    void gamesApi
      .getFinishOutcome({ gameId })
      .then((outcome) => {
        if (!cancelled && outcome) {
          setFinishOutcomeFromApi(outcome);
        }
      })
      .catch((error) => {
        console.error('Failed to load finish outcome', error);
      });

    return () => {
      cancelled = true;
    };
  }, [
    startGameOverSequence,
    finishOutcomeFromSocket,
    finishOutcomeFromApi,
    gameId,
  ]);

  const finishOutcome = useMemo(() => {
    if (finishOutcomeFromSocket) return finishOutcomeFromSocket;
    if (finishOutcomeFromApi) return finishOutcomeFromApi;
    if (!startGameOverSequence) return null;
    return buildFallbackFinishOutcome(players, playerScores);
  }, [
    finishOutcomeFromSocket,
    finishOutcomeFromApi,
    startGameOverSequence,
    players,
    playerScores,
  ]);

  const playersByOutcomeId = useMemo(() => {
    if (!finishOutcome) return {};
    return Object.fromEntries(
      finishOutcome.players.map((player) => [player.playerId, player]),
    );
  }, [finishOutcome]);

  const {
    showOverlay: showGameOverOverlay,
    phase: gameOverPhase,
    bubbleText: gameOverBubbleText,
    bubbleVisible: gameOverBubbleVisible,
    revealedPlayerIds: gameOverRevealedPlayerIds,
    showReturnButton: showGameOverReturnButton,
  } = useWordSoupGameOver({
    active: startGameOverSequence,
    outcome: finishOutcome,
  });

  const handleGuessSubmitted = useCallback(() => {
    pendingGuessRef.current = true;
  }, []);

  const handleGuessFailed = useCallback(() => {
    pendingGuessRef.current = false;
    celebrationActiveRef.current = false;
    pendingCourtRef.current = null;
  }, [celebrationActiveRef, pendingCourtRef]);

  const handleGuessSucceeded = useCallback(() => {
    // Safety net if wordGuessed celebration never starts.
    window.setTimeout(() => {
      if (pendingGuessRef.current && !celebrationActiveRef.current) {
        pendingGuessRef.current = false;
      }
    }, 800);
  }, [celebrationActiveRef]);

  const resolveGuessMessage = useCallback(
    (result: WordSoupGuessResultDto) => {
      if (
        result.messageKey === 'wrongPosition' ||
        result.messageKey === 'alreadyFoundElsewhere'
      ) {
        return tGuess(result.messageKey);
      }
      return result.message;
    },
    [tGuess],
  );

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
    resolveGuessMessage,
    onGuessSubmitted: handleGuessSubmitted,
    onGuessFailed: handleGuessFailed,
    onGuessSucceeded: handleGuessSucceeded,
  });

  const lastNoticeKeyRef = useRef('');

  useEffect(() => {
    if (!selectionMessage) return;

    // Freeze/unfreeze announcements come from structured freeze notices.
    if (guessResult?.frozen || /frozen|chill|🧊/i.test(selectionMessage)) {
      return;
    }
    if (guessResult?.success) {
      return;
    }

    const key = selectionMessage;
    if (lastNoticeKeyRef.current === key) return;
    lastNoticeKeyRef.current = key;

    pushEvent({
      kind: 'notice',
      headline: selectionMessage,
      clothesColor: '#F59E0B',
    });
  }, [selectionMessage, pushEvent, guessResult]);

  useEffect(() => {
    if (!selectionMessage) {
      lastNoticeKeyRef.current = '';
    }
  }, [selectionMessage]);

  useEffect(() => {
    clearSelectionRef.current = clearSelection;
    setIsSubmittingGuessRef.current = setIsSubmittingGuess;
  }, [clearSelection, setIsSubmittingGuess]);

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
    const result = await gamesApi.finish({ gameId });
    if (result.outcome) {
      setFinishOutcomeFromApi(result.outcome);
    }
  }, [gameId]);

  const handleReturnToLobby = useCallback(async () => {
    try {
      if (!gameFinished && !game?.isFinished) {
        const result = await gamesApi.finish({ gameId });
        if (result.outcome) {
          setFinishOutcomeFromApi(result.outcome);
        }
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

  return {
    game,
    loading,
    courtInitError,
    retryInitCourt,
    isConnected,
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
    showGameOverOverlay,
    startGameOverSequence,
    gameOverPhase,
    gameOverBubbleText,
    gameOverBubbleVisible,
    gameOverRevealedPlayerIds,
    gameOverPlayersById: playersByOutcomeId,
    showGameOverReturnButton,
    eventBanner,
    eventBannerPhase,
    scorePopup,
    wordCelebration,
    sortedPlayers,
    solutionWords,
    gameReady,
    showIntro,
    introPhase,
    introBubbleText,
    introBubbleVisible,
    wordRevealIndex,
    introCountdownValue,
    introTotalWords,
    playStartedAt,
    showAbandonModal,
    isAbandoning,
    wordsFound,
    wordsLeft,
    isGameOver,
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
