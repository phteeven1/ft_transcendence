'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import type { GameFinishOutcomeDto } from '@/lib/api/games/types';
import {
  buildGameOverAnnouncements,
  getGameOverClosingText,
} from './word-soup-game-over.helpers';
import { GAME_OVER_COURT_HOLD_MS } from '@/app/word_soup_scaffold/_lib/word-soup-constants';

export type GameOverPhase =
  | 'idle'
  | 'hold'
  | 'announce'
  | 'announce-gap'
  | 'closing'
  | 'closing-gap'
  | 'done';

const CHAR_MS = 42;
const HOLD_AFTER_TYPE_MS = 900;
const BUBBLE_FADE_MS = 380;
const GAP_MS = 420;
const GAP_DURATION_MS = BUBBLE_FADE_MS + GAP_MS;

type TimelineSegment =
  | { kind: 'hold'; duration: number }
  | { kind: 'announce'; playerId: number; text: string }
  | { kind: 'closing'; text: string };

type GameOverFrame = {
  phase: GameOverPhase;
  bubbleText: string;
  typedLength: number;
  bubbleVisible: boolean;
  revealedPlayerIds: number[];
  done: boolean;
};

function typedLengthAt(localMs: number, text: string): number {
  if (text.length === 0) return 0;
  return Math.min(text.length, Math.floor(Math.max(0, localMs) / CHAR_MS));
}

function speechBlockMs(text: string): number {
  return text.length * CHAR_MS + HOLD_AFTER_TYPE_MS;
}

function buildTimelineSegments(outcome: GameFinishOutcomeDto): TimelineSegment[] {
  const segments: TimelineSegment[] = [
    { kind: 'hold', duration: GAME_OVER_COURT_HOLD_MS },
  ];

  for (const announcement of buildGameOverAnnouncements(outcome.players)) {
    segments.push({
      kind: 'announce',
      playerId: announcement.playerId,
      text: announcement.speech,
    });
  }

  segments.push({
    kind: 'closing',
    text: getGameOverClosingText(outcome.players),
  });
  return segments;
}

function getGameOverFrameAt(
  elapsedMs: number,
  segments: TimelineSegment[],
): GameOverFrame {
  if (elapsedMs < 0 || segments.length === 0) {
    return {
      phase: 'idle',
      bubbleText: '',
      typedLength: 0,
      bubbleVisible: false,
      revealedPlayerIds: [],
      done: false,
    };
  }

  let t = 0;
  const revealedPlayerIds: number[] = [];

  for (const segment of segments) {
    if (segment.kind === 'hold') {
      if (elapsedMs < t + segment.duration) {
        return {
          phase: 'hold',
          bubbleText: '',
          typedLength: 0,
          bubbleVisible: false,
          revealedPlayerIds,
          done: false,
        };
      }
      t += segment.duration;
      continue;
    }

    const speechMs = speechBlockMs(segment.text);
    if (elapsedMs < t + speechMs) {
      const local = elapsedMs - t;
      return {
        phase: segment.kind === 'closing' ? 'closing' : 'announce',
        bubbleText: segment.text,
        typedLength: typedLengthAt(local, segment.text),
        bubbleVisible: true,
        revealedPlayerIds,
        done: false,
      };
    }
    t += speechMs;

    if (segment.kind === 'announce') {
      revealedPlayerIds.unshift(segment.playerId);
    }

    if (elapsedMs < t + GAP_DURATION_MS) {
      return {
        phase: segment.kind === 'closing' ? 'closing-gap' : 'announce-gap',
        bubbleText: segment.text,
        typedLength: segment.text.length,
        bubbleVisible: false,
        revealedPlayerIds,
        done: false,
      };
    }
    t += GAP_DURATION_MS;
  }

  return {
    phase: 'done',
    bubbleText: '',
    typedLength: 0,
    bubbleVisible: false,
    revealedPlayerIds,
    done: true,
  };
}

const IDLE_FRAME: GameOverFrame = {
  phase: 'idle',
  bubbleText: '',
  typedLength: 0,
  bubbleVisible: false,
  revealedPlayerIds: [],
  done: false,
};

type UseWordSoupGameOverProps = {
  active: boolean;
  outcome: GameFinishOutcomeDto | null;
};

export function useWordSoupGameOver({ active, outcome }: UseWordSoupGameOverProps) {
  const [frame, setFrame] = useState<GameOverFrame>(IDLE_FRAME);
  const segmentsRef = useRef<TimelineSegment[]>([]);

  useLayoutEffect(() => {
    if (!active || !outcome) {
      setFrame(IDLE_FRAME);
      return;
    }

    segmentsRef.current = buildTimelineSegments(outcome);

    let rafId = 0;
    let cancelled = false;
    const startedAt = Date.now();

    const applyElapsed = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt;
      const next = getGameOverFrameAt(elapsed, segmentsRef.current);
      setFrame(next);

      if (next.done) return;

      rafId = window.requestAnimationFrame(applyElapsed);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        window.cancelAnimationFrame(rafId);
        rafId = window.requestAnimationFrame(applyElapsed);
      }
    };

    rafId = window.requestAnimationFrame(applyElapsed);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, outcome]);

  const displayedText = frame.bubbleText.slice(0, frame.typedLength);
  const showOverlay = active && frame.phase !== 'idle' && frame.phase !== 'hold';

  return {
    showOverlay,
    isCourtHold: active && frame.phase === 'hold',
    phase: frame.phase,
    bubbleText: displayedText,
    bubbleVisible: frame.bubbleVisible,
    revealedPlayerIds: frame.revealedPlayerIds,
    showReturnButton: frame.done,
  };
}
