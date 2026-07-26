'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GAME_OVER_OVERLAY_GRACE_MS,
  SCORE_POPUP_MS,
} from '@/app/word_soup_scaffold/_lib/word-soup-constants';
import type { WordSoupEventBanner } from './use-word-soup-event-banner';
import type { WordSoup } from '@/lib/api/games/word-soup/types';

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
  latestFreezeNotice: WordSoup.FreezeNoticeDto | null;
  latestPlayerLeft: { playerId: number; playerName: string } | null;
  playerColours: Record<number, string>;
  pushEvent: (event: Omit<WordSoupEventBanner, 'id'>) => void;
};

export function useWordSoupEventBridge({
  playerId,
  latestFreezeNotice,
  latestPlayerLeft,
  playerColours,
  pushEvent,
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
        headline: `${latestFreezeNotice.playerName} is back!`,
        clothesColor: colour,
      });
    } else {
      pushEvent({
        kind: 'freeze',
        headline: `${latestFreezeNotice.playerName} is frozen!`,
        clothesColor: colour,
      });
    }
  }, [latestFreezeNotice, playerColours, pushEvent, playerId]);

  useEffect(() => {
    if (!latestPlayerLeft) return;
    const key = `${latestPlayerLeft.playerId}|${latestPlayerLeft.playerName}`;
    if (lastLeftEventKeyRef.current === key) return;
    lastLeftEventKeyRef.current = key;

    pushEvent({
      kind: 'player-left',
      headline: `${latestPlayerLeft.playerName} left the game`,
      clothesColor: playerColours[latestPlayerLeft.playerId] ?? '#9CA3AF',
    });
  }, [latestPlayerLeft, playerColours, pushEvent]);
}

export function useWordSoupGameOverOverlay(
  isGameOver: boolean,
  isCelebrating: boolean,
  celebrationActiveRef: { current: boolean },
) {
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
    }, GAME_OVER_OVERLAY_GRACE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isGameOver, isCelebrating, celebrationActiveRef]);

  return allowGameOverOverlay && !isCelebrating;
}
