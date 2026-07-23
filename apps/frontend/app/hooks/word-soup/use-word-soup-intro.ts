'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { wordSoupApi } from '@/lib/api';

export type IntroPhase =
  | 'idle'
  | 'welcome'
  | 'welcome-gap'
  | 'briefing'
  | 'briefing-gap'
  | 'words-intro'
  | 'words-intro-gap'
  | 'word'
  | 'word-gap'
  | 'countdown'
  | 'done';

export type IntroCountdownValue = 3 | 2 | 1 | 'GO!' | null;

type UseWordSoupIntroProps = {
  gameId: number;
  playerId: number;
  courtReady: boolean;
  solutionWords: string[];
  hasPlayerSeenIntro: boolean;
  skipIntro?: boolean;
};

const CHAR_MS = 42;
const WORD_CHAR_MS = 70;
const HOLD_AFTER_TYPE_MS = 900;
const BUBBLE_FADE_MS = 380;
const GAP_MS = 420;
const COUNTDOWN_STEP_MS = 750;
const GO_HOLD_MS = 900;

const WELCOME_TEXT = 'Welcome to Word Soup!';
const BRIEFING_TEXT = 'In this game, you have to find words in the grid.';
const WORDS_INTRO_TEXT = 'Here are the words...';

export function useWordSoupIntro({
  gameId,
  playerId,
  courtReady,
  solutionWords,
  hasPlayerSeenIntro,
  skipIntro = false,
}: UseWordSoupIntroProps) {
  const [phase, setPhase] = useState<IntroPhase>('idle');
  const [bubbleText, setBubbleText] = useState('');
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [typedLength, setTypedLength] = useState(0);
  const [wordRevealIndex, setWordRevealIndex] = useState(0);
  const [countdownValue, setCountdownValue] = useState<IntroCountdownValue>(null);
  const [gameReady, setGameReady] = useState(false);

  const introStartedRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const intervalsRef = useRef<number[]>([]);
  const wordIndexRef = useRef(0);
  const runIdRef = useRef(0);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    intervalsRef.current.forEach((id) => window.clearInterval(id));
    timersRef.current = [];
    intervalsRef.current = [];
  };

  const schedule = (fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  };

  useEffect(() => {
    introStartedRef.current = false;
    runIdRef.current += 1;
    clearTimers();
    setPhase('idle');
    setBubbleText('');
    setBubbleVisible(false);
    setTypedLength(0);
    setWordRevealIndex(0);
    setCountdownValue(null);
    setGameReady(false);
    wordIndexRef.current = 0;
  }, [gameId]);

  useLayoutEffect(() => {
    if (!courtReady) return;

    if (hasPlayerSeenIntro || skipIntro) {
      setGameReady(true);
      setPhase('done');
      setBubbleVisible(false);
      setCountdownValue(null);
      return;
    }

    if (introStartedRef.current) return;
    if (solutionWords.length === 0) return;

    introStartedRef.current = true;
    const runId = ++runIdRef.current;
    setGameReady(false);
    wordIndexRef.current = 0;
    setWordRevealIndex(0);
    setCountdownValue(null);

    const stillActive = () => runId === runIdRef.current;

    const startTypewriter = (
      text: string,
      perCharMs: number,
      onComplete: () => void,
    ) => {
      setBubbleText(text);
      setBubbleVisible(true);
      setTypedLength(0);

      let length = 0;
      const intervalId = window.setInterval(() => {
        if (!stillActive()) {
          window.clearInterval(intervalId);
          return;
        }
        length += 1;
        setTypedLength(length);
        if (length >= text.length) {
          window.clearInterval(intervalId);
          schedule(onComplete, HOLD_AFTER_TYPE_MS);
        }
      }, perCharMs);
      intervalsRef.current.push(intervalId);
    };

    const fadeBubbleThen = (next: () => void) => {
      setBubbleVisible(false);
      schedule(next, BUBBLE_FADE_MS + GAP_MS);
    };

    const startCountdown = () => {
      if (!stillActive()) return;
      setPhase('countdown');
      setBubbleVisible(false);
      setBubbleText('');
      setTypedLength(0);

      const steps: IntroCountdownValue[] = [3, 2, 1, 'GO!'];
      let step = 0;

      const tick = () => {
        if (!stillActive()) return;
        if (step >= steps.length) {
          setCountdownValue(null);
          setPhase('done');
          setGameReady(true);
          void wordSoupApi.markIntroShown({ gameId, playerId }).catch((error) => {
            console.error('Failed to mark intro shown', error);
          });
          return;
        }

        setCountdownValue(steps[step]);
        const hold = steps[step] === 'GO!' ? GO_HOLD_MS : COUNTDOWN_STEP_MS;
        step += 1;
        schedule(tick, hold);
      };

      tick();
    };

    const revealNextWord = () => {
      if (!stillActive()) return;
      const index = wordIndexRef.current;
      if (index >= solutionWords.length) {
        startCountdown();
        return;
      }

      setPhase('word');
      setWordRevealIndex(index);
      const word = solutionWords[index] ?? '';
      wordIndexRef.current = index + 1;

      startTypewriter(word, WORD_CHAR_MS, () => {
        if (!stillActive()) return;
        setPhase('word-gap');
        fadeBubbleThen(revealNextWord);
      });
    };

    const startWordsIntro = () => {
      if (!stillActive()) return;
      setPhase('words-intro');
      startTypewriter(WORDS_INTRO_TEXT, CHAR_MS, () => {
        if (!stillActive()) return;
        setPhase('words-intro-gap');
        fadeBubbleThen(revealNextWord);
      });
    };

    const startBriefing = () => {
      if (!stillActive()) return;
      setPhase('briefing');
      startTypewriter(BRIEFING_TEXT, CHAR_MS, () => {
        if (!stillActive()) return;
        setPhase('briefing-gap');
        fadeBubbleThen(startWordsIntro);
      });
    };

    setPhase('welcome');
    startTypewriter(WELCOME_TEXT, CHAR_MS, () => {
      if (!stillActive()) return;
      setPhase('welcome-gap');
      fadeBubbleThen(startBriefing);
    });

    return () => {
      runIdRef.current += 1;
      clearTimers();
    };
  }, [courtReady, gameId, playerId, solutionWords, hasPlayerSeenIntro, skipIntro]);

  const showIntro =
    courtReady && !gameReady && !hasPlayerSeenIntro && !skipIntro;

  const displayedText = bubbleText.slice(0, typedLength);

  return {
    gameReady,
    showIntro,
    phase,
    bubbleText: displayedText,
    bubbleVisible,
    wordRevealIndex,
    countdownValue,
    totalWords: solutionWords.length,
  };
}
