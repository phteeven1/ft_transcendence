'use client';

import { useEffect, useRef, useState } from 'react';

import { wordSoupApi } from '@/lib/api';

type UseWordSoupIntroProps = {
  gameId: number;
  playerId: number;
  courtReady: boolean;
  solutionWords: string[];
  hasPlayerSeenIntro: boolean;
  skipIntro?: boolean;
};

export function useWordSoupIntro({
  gameId,
  playerId,
  courtReady,
  solutionWords,
  hasPlayerSeenIntro,
  skipIntro = false,
}: UseWordSoupIntroProps) {
  const [showWordReveal, setShowWordReveal] = useState(false);
  const [wordRevealIndex, setWordRevealIndex] = useState(0);
  const [gameReady, setGameReady] = useState(false);

  const introRevealStartedRef = useRef(false);
  const introTimersRef = useRef<number[]>([]);

  useEffect(() => {
    introRevealStartedRef.current = false;
    introTimersRef.current.forEach((id) => window.clearTimeout(id));
    introTimersRef.current = [];
    setShowWordReveal(false);
    setWordRevealIndex(0);
    setGameReady(false);
  }, [gameId]);

  useEffect(() => {
    if (!courtReady || solutionWords.length === 0) {
      return;
    }

    if (hasPlayerSeenIntro || skipIntro) {
      setGameReady(true);
      setShowWordReveal(false);
      return;
    }

    if (introRevealStartedRef.current) {
      return;
    }

    introRevealStartedRef.current = true;
    setGameReady(false);
    setShowWordReveal(true);
    setWordRevealIndex(0);

    let index = 0;

    const revealNextWord = async () => {
      if (index >= solutionWords.length) {
        setShowWordReveal(false);
        setGameReady(true);

        try {
          await wordSoupApi.markIntroShown({ gameId, playerId });
        } catch (error) {
          console.error('Failed to mark intro shown', error);
        }
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
    };
  }, [courtReady, gameId, playerId, solutionWords, hasPlayerSeenIntro, skipIntro]);

  return {
    gameReady,
    showWordReveal,
    wordRevealIndex,
  };
}
