'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { gamesApi } from '@/lib/api';
import type { GameFinishOutcomeDto } from '@/lib/api/games/types';
import { restorePlayerFromSession } from '@/lib/restore-player-session';
import { stashPendingAvatarUnlock } from '@/lib/avatar-unlock';
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
  const { loginAsPlayer, setSessionExpiresAt } = useAuth();
  const tGuess = useTranslations('games.wordSoup.guess');
  const tIntro = useTranslations('games.wordSoup.intro');
  const tOutro = useTranslations('games.wordSoup.outro');
  const tEvents = useTranslations('games.wordSoup.events');
  const tControls = useTranslations('games.controls');

  const introTexts = useMemo(
    () => ({
      welcome: tIntro('welcome'),
      briefing: tIntro('briefing'),
      wordsIntro: tIntro('wordsIntro'),
      letsGo: tIntro('letsGo'),
    }),
    [tIntro],
  );

  const formatPlayerFoundWord = useCallback(
    (name: string, word: string) => tEvents('playerFoundWord', { name, word }),
    [tEvents],
  );
  const formatLastWord = useCallback(() => tEvents('lastWord'), [tEvents]);
  const formatPlayerFrozen = useCallback(
    (name: string) => tEvents('playerFrozen', { name }),
    [tEvents],
  );
  const formatPlayerUnfrozen = useCallback(
    (name: string) => tEvents('playerUnfrozen', { name }),
    [tEvents],
  );
  const formatPlayerLeft = useCallback(
    (name: string) => tEvents('playerLeft', { name }),
    [tEvents],
  );

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

  const [manuallyFinished, setManuallyFinished] = useState(false);
  const [isFinishingGame, setIsFinishingGame] = useState(false);
  const [finishedDuringIntro, setFinishedDuringIntro] = useState(false);

  const gameEnded =
    manuallyFinished || gameFinished || Boolean(game?.isFinished);

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
    introTexts,
    skipIntro: initIsComplete || gameEnded,
    skipMarkIntroShown: gameEnded,
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
        byId.set(playerIdNum, {
          id: playerIdNum,
          name,
          avatarTier: 0,
          avatarAnimal: 0,
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
    gameEnded ||
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
        headline: formatPlayerFoundWord(result.playerName, result.word),
        clothesColor: colour,
      });
      if (result.isPenultimate) {
        pushEvent({
          kind: 'final-word',
          headline: formatLastWord(),
          clothesColor: '#F59E0B',
        });
      }
    },
    [playerColours, pushEvent, formatPlayerFoundWord, formatLastWord],
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
    formatPlayerFrozen,
    formatPlayerUnfrozen,
    formatPlayerLeft,
  });

  const startGameOverSequence = useWordSoupGameOverOverlay(
    isGameOver,
    isCelebrating,
    celebrationActiveRef,
    manuallyFinished,
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
      .catch(() => {
        /* overlay still uses the local fallback outcome */
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
    const fallback = buildFallbackFinishOutcome(players, playerScores);
    if (!manuallyFinished) return fallback;
    return {
      players: fallback.players.map((player) => ({
        ...player,
        xpAwarded: 0,
      })),
    };
  }, [
    finishOutcomeFromSocket,
    finishOutcomeFromApi,
    startGameOverSequence,
    manuallyFinished,
    players,
    playerScores,
  ]);

  const playersByOutcomeId = useMemo(() => {
    if (!finishOutcome) return {};
    return Object.fromEntries(
      finishOutcome.players.map((player) => [player.playerId, player]),
    );
  }, [finishOutcome]);

  const playerAvatarTiers = useMemo(() => {
    const tiers: Record<number, number> = {};
    for (const player of players) {
      tiers[player.id] = player.avatarTier ?? 0;
    }
    return tiers;
  }, [players]);

  const playerAvatarAnimals = useMemo(() => {
    const animals: Record<number, number> = {};
    for (const player of players) {
      animals[player.id] = player.avatarAnimal ?? 0;
    }
    return animals;
  }, [players]);

  const localHostTier = playerAvatarTiers[playerId] ?? 0;
  const localHostAnimal = playerAvatarAnimals[playerId] ?? 0;

  const newlyUnlockedTier = useMemo(() => {
    const fromOutcome = finishOutcome?.players.find(
      (entry) => entry.playerId === playerId,
    )?.newlyUnlockedTier;
    return typeof fromOutcome === 'number' ? fromOutcome : null;
  }, [finishOutcome, playerId]);

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
    outroT: tOutro,
    skipInitialHold: finishedDuringIntro,
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
  const [actionError, setActionError] = useState('');
  const hasNavigatedToLobbyRef = useRef(false);

  const navigateToLobby = useCallback(async () => {
    if (hasNavigatedToLobbyRef.current) return;
    hasNavigatedToLobbyRef.current = true;
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

  const isLastRemaining =
    players.length > 0 &&
    players.filter((entry) => entry.id === playerId || !leftPlayers[entry.id])
      .length <= 1;

  const handleLeaveClick = useCallback(() => {
    setActionError('');
    setShowAbandonModal(true);
  }, []);

  const finishMatch = useCallback(async () => {
    if (isGameOver || isFinishingGame) return;

    const wasDuringIntro = showIntro;
    setIsFinishingGame(true);
    setManuallyFinished(true);
    setActionError('');
    if (wasDuringIntro) {
      setFinishedDuringIntro(true);
    }

    try {
      const result = await gamesApi.finish({ gameId });
      if (result.outcome) {
        const unlock = result.outcome.players.find(
          (entry) =>
            entry.playerId === playerId &&
            typeof entry.newlyUnlockedTier === 'number',
        )?.newlyUnlockedTier;
        if (typeof unlock === 'number') {
          stashPendingAvatarUnlock(playerId, unlock);
        }
        setFinishOutcomeFromApi(result.outcome);
      }
    } catch {
      setManuallyFinished(false);
      setFinishedDuringIntro(false);
      setActionError(tControls('actionFailed'));
    } finally {
      setIsFinishingGame(false);
    }
  }, [gameId, isFinishingGame, isGameOver, showIntro, playerId, tControls]);

  const handleReturnToLobby = useCallback(async () => {
    try {
      if (!gameEnded) {
        const result = await gamesApi.finish({ gameId });
        if (result.outcome) {
          const unlock = result.outcome.players.find(
            (entry) =>
              entry.playerId === playerId &&
              typeof entry.newlyUnlockedTier === 'number',
          )?.newlyUnlockedTier;
          if (typeof unlock === 'number') {
            stashPendingAvatarUnlock(playerId, unlock);
          }
          setFinishOutcomeFromApi(result.outcome);
        }
      }
    } catch {
      setActionError(tControls('actionFailed'));
      return;
    }
    await navigateToLobby();
  }, [gameId, gameEnded, navigateToLobby, playerId, tControls]);

  const leaveToLobby = useCallback(async () => {
    if (isLastRemaining) {
      setShowAbandonModal(false);
      await finishMatch();
      return;
    }

    setIsAbandoning(true);
    try {
      await gamesApi.leave({ gameId, playerId });
      setShowAbandonModal(false);
      await navigateToLobby();
    } catch {
      setActionError(tControls('actionFailed'));
      setShowAbandonModal(false);
    } finally {
      setIsAbandoning(false);
    }
  }, [
    finishMatch,
    gameId,
    isLastRemaining,
    navigateToLobby,
    playerId,
    tControls,
  ]);

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
    playerAvatarTiers,
    playerAvatarAnimals,
    localHostTier,
    localHostAnimal,
    newlyUnlockedTier,
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
    isLastRemaining,
    actionError,
    wordsFound,
    wordsLeft,
    isGameOver,
    isFinishingGame,
    isSubmittingGuess,
    handleSelectionStart,
    handleSelectionContinue,
    handleSelectionEnd,
    handleSubmitGuess,
    handleLeaveClick,
    handleReturnToLobby,
    leaveToLobby,
    closeAbandonModal: () => setShowAbandonModal(false),
  };
}
