'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GAME_OVER_OVERLAY_GRACE_MS,
  SCORE_POPUP_MS,
} from '@/app/word_soup_scaffold/_lib/word-soup-constants';
import type { WordSoupEventBanner } from './use-word-soup-event-banner';
import type { WordSoupFreezeNoticeDto } from '@/lib/api/games/word-soup/types';

type ScorePopup = {
  id: number;
  playerId: number;
  points: number;
};

export function useWordSoupScorePopup() {
  const [scorePopup, setScorePopup] = useState<ScorePopup | null>(null);
  const scorePopupTimerRef = useRef<number | null>(null);

  const showScorePopup = useCallback((playerIdForPopup: number, points: number) => {
    if (scorePopupTimerRef.current !== null) {
      window.clearTimeout(scorePopupTimerRef.current);
    }
    setScorePopup({ id: Date.now(), playerId: playerIdForPopup, points });
    scorePopupTimerRef.current = window.setTimeout(() => {
      setScorePopup(null);
      scorePopupTimerRef.current = null;
    }, SCORE_POPUP_MS);
  }, []);

  useEffect(
    () => () => {
      if (scorePopupTimerRef.current !== null) {
        window.clearTimeout(scorePopupTimerRef.current);
      }
    },
    [],
  );

  return { scorePopup, showScorePopup };
}

type FreezeBridgeArgs = {
  playerId: number;
  latestFreezeNotice: WordSoupFreezeNoticeDto | null;
  latestPlayerLeft: { playerId: number; playerName: string } | null;
  playerColours: Record<number, string>;
  pushEvent: (event: Omit<WordSoupEventBanner, 'id'>) => void;
  formatPlayerFrozen: (name: string) => string;
  formatPlayerUnfrozen: (name: string) => string;
  formatPlayerLeft: (name: string) => string;
};

export function useWordSoupEventBridge({
  playerId,
  latestFreezeNotice,
  latestPlayerLeft,
  playerColours,
  pushEvent,
  formatPlayerFrozen,
  formatPlayerUnfrozen,
  formatPlayerLeft,
}: FreezeBridgeArgs) {
  const lastFreezeEventKeyRef = useRef('');
  const lastLeftEventKeyRef = useRef('');

  useEffect(() => {
    if (!latestFreezeNotice) return;
    const key = `${latestFreezeNotice.playerId}|${latestFreezeNotice.kind ?? latestFreezeNotice.message}`;
    if (lastFreezeEventKeyRef.current === key) return;
    lastFreezeEventKeyRef.current = key;

    const isUnfreeze = latestFreezeNotice.kind === 'unfreeze';
    const colour = playerColours[latestFreezeNotice.playerId] ?? '#38BDF8';

    // Local freeze already has the court overlay — only broadcast others' freezes.
    if (!isUnfreeze && latestFreezeNotice.playerId === playerId) {
      return;
    }

    if (isUnfreeze) {
      pushEvent({
        kind: 'unfreeze',
        headline: formatPlayerUnfrozen(latestFreezeNotice.playerName),
        clothesColor: colour,
      });
    } else {
      pushEvent({
        kind: 'freeze',
        headline: formatPlayerFrozen(latestFreezeNotice.playerName),
        clothesColor: colour,
      });
    }
  }, [
    latestFreezeNotice,
    playerColours,
    pushEvent,
    playerId,
    formatPlayerFrozen,
    formatPlayerUnfrozen,
  ]);

  useEffect(() => {
    if (!latestPlayerLeft) return;
    const key = `${latestPlayerLeft.playerId}|${latestPlayerLeft.playerName}`;
    if (lastLeftEventKeyRef.current === key) return;
    lastLeftEventKeyRef.current = key;

    pushEvent({
      kind: 'player-left',
      headline: formatPlayerLeft(latestPlayerLeft.playerName),
      clothesColor: playerColours[latestPlayerLeft.playerId] ?? '#9CA3AF',
    });
  }, [latestPlayerLeft, playerColours, pushEvent, formatPlayerLeft]);
}

export function useWordSoupGameOverOverlay(
  isGameOver: boolean,
  isCelebrating: boolean,
  celebrationActiveRef: { current: boolean },
  startImmediately = false,
) {
  const [startGameOverSequence, setStartGameOverSequence] = useState(false);
  const [sawCompletionCelebration, setSawCompletionCelebration] = useState(false);
  const [prevIsGameOver, setPrevIsGameOver] = useState(isGameOver);
  const [prevIsCelebrating, setPrevIsCelebrating] = useState(isCelebrating);

  if (isGameOver !== prevIsGameOver) {
    setPrevIsGameOver(isGameOver);
    if (!isGameOver) {
      setStartGameOverSequence(false);
      setSawCompletionCelebration(false);
    }
  }

  if (isCelebrating !== prevIsCelebrating) {
    setPrevIsCelebrating(isCelebrating);
    if (isGameOver && isCelebrating) {
      setSawCompletionCelebration(true);
      setStartGameOverSequence(false);
    } else if (isGameOver && !isCelebrating && sawCompletionCelebration) {
      setStartGameOverSequence(true);
    }
  }

  useEffect(() => {
    if (
      !isGameOver ||
      isCelebrating ||
      sawCompletionCelebration ||
      startGameOverSequence
    ) {
      return;
    }

    if (startImmediately) {
      const timeoutId = window.setTimeout(() => {
        if (!celebrationActiveRef.current) {
          setStartGameOverSequence(true);
        }
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      if (!celebrationActiveRef.current) {
        setStartGameOverSequence(true);
      }
    }, GAME_OVER_OVERLAY_GRACE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [
    isGameOver,
    isCelebrating,
    sawCompletionCelebration,
    startGameOverSequence,
    celebrationActiveRef,
    startImmediately,
  ]);

  return startGameOverSequence && !isCelebrating;
}
