'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type WordSoupEventKind =
  | 'word-found'
  | 'freeze'
  | 'unfreeze'
  | 'player-left'
  | 'final-word'
  | 'notice';

export type WordSoupEventBanner = {
  id: number;
  kind: WordSoupEventKind;
  headline: string;
  detail?: string;
  /** Outfit colour for the host character. */
  clothesColor: string;
};

export type EventBannerPhase = 'idle' | 'enter' | 'hold' | 'exit';

const HOLD_MS = 1200;
const EXIT_FADE_MS = 320;
const CHAR_MS = 28;

/** Shared enter/exit lengths so the hook timers and the typewriter stay in sync. */
export function getEventBannerDurations(event: Pick<WordSoupEventBanner, 'headline' | 'detail'>) {
  const len = event.headline.length + (event.detail?.length ?? 0);
  return {
    enterMs: Math.max(400, len * CHAR_MS + 60),
    holdMs: HOLD_MS,
    exitMs: EXIT_FADE_MS,
  };
}

let nextEventId = 1;

export function useWordSoupEventBanner() {
  const [queue, setQueue] = useState<WordSoupEventBanner[]>([]);
  const [current, setCurrent] = useState<WordSoupEventBanner | null>(null);
  const [phase, setPhase] = useState<EventBannerPhase>('idle');
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const pushEvent = useCallback((event: Omit<WordSoupEventBanner, 'id'>) => {
    setQueue((prev) => [...prev, { ...event, id: nextEventId++ }]);
  }, []);

  useEffect(() => {
    if (current || phase !== 'idle') return;
    if (queue.length === 0) return;

    const [next, ...rest] = queue;
    setQueue(rest);
    setCurrent(next);
    setPhase('enter');
  }, [current, phase, queue]);

  useEffect(() => {
    if (!current || phase === 'idle') return;

    clearTimers();
    const { enterMs, holdMs, exitMs } = getEventBannerDurations(current);

    if (phase === 'enter') {
      const id = window.setTimeout(() => setPhase('hold'), enterMs);
      timersRef.current.push(id);
    } else if (phase === 'hold') {
      const id = window.setTimeout(() => setPhase('exit'), holdMs);
      timersRef.current.push(id);
    } else if (phase === 'exit') {
      const id = window.setTimeout(() => {
        setCurrent(null);
        setPhase('idle');
      }, exitMs);
      timersRef.current.push(id);
    }

    return clearTimers;
  }, [current, phase, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    eventBanner: current,
    eventBannerPhase: phase,
    pushEvent,
  };
}
