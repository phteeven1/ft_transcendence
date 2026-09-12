'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import type { GameFinishOutcomeDto } from '@/lib/api/games/types';
import {
  CHAR_MS,
  DEFAULT_HOLD_DURATION_MS,
  GAP_DURATION_MS,
  HOLD_AFTER_TYPE_MS,
} from './game-timing.constants';
import type { LocaleCode } from '@/i18n/config';
import {
  buildGameOverAnnouncements,
  getGameOverClosingText,
  type OutroTranslateFn,
} from './game-over.helpers';

export type GameOverPhase =
  | 'idle'
  | 'hold'
  | 'announce'
  | 'announce-gap'
  | 'closing'
  | 'closing-gap'
  | 'done';

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

function buildTimelineSegments(
  outcome: GameFinishOutcomeDto,
  t: OutroTranslateFn,
  locale: LocaleCode,
  holdDurationMs: number,
  skipInitialHold = false,
): TimelineSegment[] {
  const segments: TimelineSegment[] = skipInitialHold
    ? []
    : [{ kind: 'hold', duration: holdDurationMs }];

  for (const announcement of buildGameOverAnnouncements(outcome.players, t, locale)) {
    segments.push({
      kind: 'announce',
      playerId: announcement.playerId,
      text: announcement.speech,
    });
  }

  segments.push({
    kind: 'closing',
    text: getGameOverClosingText(outcome.players, t),
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

export interface IUseGameOverProps {
  active: boolean;
  outcome: GameFinishOutcomeDto | null;
  outroT: OutroTranslateFn;
  locale: LocaleCode;
  skipInitialHold?: boolean;
  holdDurationMs?: number;
}

export function useGameOver({
  active,
  outcome,
  outroT,
  locale,
  skipInitialHold = false,
  holdDurationMs = DEFAULT_HOLD_DURATION_MS,
}: IUseGameOverProps) {
  const [frame, setFrame] = useState<GameOverFrame>(IDLE_FRAME);
  const segmentsRef = useRef<TimelineSegment[]>([]);
  const sequenceActive = active && outcome != null;

  useLayoutEffect(() => {
    if (!sequenceActive || !outcome) return;

    segmentsRef.current = buildTimelineSegments(
      outcome,
      outroT,
      locale,
      holdDurationMs,
      skipInitialHold,
    );

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
  }, [
    sequenceActive,
    outcome,
    outroT,
    locale,
    skipInitialHold,
    holdDurationMs,
  ]);

  const displayFrame = sequenceActive ? frame : IDLE_FRAME;
  const displayedText = displayFrame.bubbleText.slice(0, displayFrame.typedLength);
  const showOverlay =
    sequenceActive &&
    displayFrame.phase !== 'idle' &&
    displayFrame.phase !== 'hold';

  return {
    showOverlay,
    phase: displayFrame.phase,
    bubbleText: displayedText,
    bubbleVisible: displayFrame.bubbleVisible,
    revealedPlayerIds: displayFrame.revealedPlayerIds,
    showReturnButton: sequenceActive && displayFrame.done,
  };
}
