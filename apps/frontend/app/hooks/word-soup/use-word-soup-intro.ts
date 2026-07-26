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
  /** Shared server timeline start (epoch ms) so all clients stay in sync. */
  introStartedAt: number | null;
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

const GAP_DURATION_MS = BUBBLE_FADE_MS + GAP_MS;

type IntroFrame = {
  phase: IntroPhase;
  bubbleText: string;
  typedLength: number;
  bubbleVisible: boolean;
  wordRevealIndex: number;
  countdownValue: IntroCountdownValue;
  done: boolean;
};

function typedLengthAt(localMs: number, text: string, charMs: number): number {
  if (text.length === 0) return 0;
  return Math.min(text.length, Math.floor(Math.max(0, localMs) / charMs));
}

function speechBlockMs(text: string, charMs: number): number {
  return text.length * charMs + HOLD_AFTER_TYPE_MS;
}

/**
 * Pure timeline: map wall-clock elapsed ms → intro frame.
 * Background tabs can catch up instantly because this does not rely on throttled timers.
 */
function getIntroFrameAt(elapsedMs: number, solutionWords: string[]): IntroFrame {
  if (elapsedMs < 0) {
    return {
      phase: 'idle',
      bubbleText: '',
      typedLength: 0,
      bubbleVisible: false,
      wordRevealIndex: 0,
      countdownValue: null,
      done: false,
    };
  }

  let t = 0;

  const runSpeech = (
    phase: IntroPhase,
    gapPhase: IntroPhase,
    text: string,
    charMs: number,
    wordRevealIndex: number,
  ): IntroFrame | null => {
    const speechMs = speechBlockMs(text, charMs);
    if (elapsedMs < t + speechMs) {
      const local = elapsedMs - t;
      return {
        phase,
        bubbleText: text,
        typedLength: typedLengthAt(local, text, charMs),
        bubbleVisible: true,
        wordRevealIndex,
        countdownValue: null,
        done: false,
      };
    }
    t += speechMs;

    if (elapsedMs < t + GAP_DURATION_MS) {
      return {
        phase: gapPhase,
        bubbleText: text,
        typedLength: text.length,
        bubbleVisible: false,
        wordRevealIndex,
        countdownValue: null,
        done: false,
      };
    }
    t += GAP_DURATION_MS;
    return null;
  };

  let hit = runSpeech('welcome', 'welcome-gap', WELCOME_TEXT, CHAR_MS, 0);
  if (hit) return hit;

  hit = runSpeech('briefing', 'briefing-gap', BRIEFING_TEXT, CHAR_MS, 0);
  if (hit) return hit;

  hit = runSpeech('words-intro', 'words-intro-gap', WORDS_INTRO_TEXT, CHAR_MS, 0);
  if (hit) return hit;

  for (let index = 0; index < solutionWords.length; index += 1) {
    const word = solutionWords[index] ?? '';
    hit = runSpeech('word', 'word-gap', word, WORD_CHAR_MS, index);
    if (hit) return hit;
  }

  const countdownSteps: Array<{ value: IntroCountdownValue; hold: number }> = [
    { value: 3, hold: COUNTDOWN_STEP_MS },
    { value: 2, hold: COUNTDOWN_STEP_MS },
    { value: 1, hold: COUNTDOWN_STEP_MS },
    { value: 'GO!', hold: GO_HOLD_MS },
  ];

  for (const step of countdownSteps) {
    if (elapsedMs < t + step.hold) {
      return {
        phase: 'countdown',
        bubbleText: '',
        typedLength: 0,
        bubbleVisible: false,
        wordRevealIndex: Math.max(0, solutionWords.length - 1),
        countdownValue: step.value,
        done: false,
      };
    }
    t += step.hold;
  }

  return {
    phase: 'done',
    bubbleText: '',
    typedLength: 0,
    bubbleVisible: false,
    wordRevealIndex: Math.max(0, solutionWords.length - 1),
    countdownValue: null,
    done: true,
  };
}

const IDLE_FRAME: IntroFrame = {
  phase: 'idle',
  bubbleText: '',
  typedLength: 0,
  bubbleVisible: false,
  wordRevealIndex: 0,
  countdownValue: null,
  done: false,
};

export function useWordSoupIntro({
  gameId,
  playerId,
  courtReady,
  solutionWords,
  hasPlayerSeenIntro,
  introStartedAt,
  skipIntro = false,
}: UseWordSoupIntroProps) {
  const [frame, setFrame] = useState<IntroFrame>(IDLE_FRAME);
  const [gameReady, setGameReady] = useState(false);

  const markedIntroRef = useRef(false);
  const wordsRef = useRef(solutionWords);
  wordsRef.current = solutionWords;

  useEffect(() => {
    markedIntroRef.current = false;
    setFrame(IDLE_FRAME);
    setGameReady(false);
  }, [gameId]);

  useLayoutEffect(() => {
    if (!courtReady) return;

    if (hasPlayerSeenIntro || skipIntro) {
      setGameReady(true);
      setFrame({
        ...IDLE_FRAME,
        phase: 'done',
        done: true,
      });
      return;
    }

    if (solutionWords.length === 0) return;
    if (introStartedAt == null) return;

    markedIntroRef.current = false;
    setGameReady(false);

    let rafId = 0;
    let cancelled = false;

    const applyElapsed = () => {
      if (cancelled) return;
      const elapsed = Date.now() - introStartedAt;
      const next = getIntroFrameAt(elapsed, wordsRef.current);
      setFrame(next);

      if (next.done) {
        setGameReady(true);
        if (!markedIntroRef.current) {
          markedIntroRef.current = true;
          void wordSoupApi.markIntroShown({ gameId, playerId }).catch((error) => {
            console.error('Failed to mark intro shown', error);
          });
        }
        return;
      }

      rafId = window.requestAnimationFrame(applyElapsed);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        window.cancelAnimationFrame(rafId);
        applyElapsed();
      }
    };

    applyElapsed();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [
    courtReady,
    gameId,
    playerId,
    solutionWords,
    hasPlayerSeenIntro,
    introStartedAt,
    skipIntro,
  ]);

  const showIntro =
    courtReady && !gameReady && !hasPlayerSeenIntro && !skipIntro;

  const displayedText = frame.bubbleText.slice(0, frame.typedLength);

  return {
    gameReady,
    showIntro,
    phase: frame.phase,
    bubbleText: displayedText,
    bubbleVisible: frame.bubbleVisible,
    wordRevealIndex: frame.wordRevealIndex,
    countdownValue: frame.countdownValue,
    totalWords: solutionWords.length,
  };
}
