'use client';

import { useLayoutEffect, useState } from 'react';
import type { IntroCountdownValue, IntroPhase } from '@/app/hooks/word-soup/use-word-soup-intro';
import SoupHostCharacter from './soup-host-character';
import type { CourtSize } from './court-size';
import {
  introBubbleHorizontalInset,
  longestSolutionWord,
} from './intro-bubble-width';

type WordSoupIntroOverlayProps = {
  phase: IntroPhase;
  bubbleText: string;
  bubbleVisible: boolean;
  wordRevealIndex: number;
  totalWords: number;
  countdownValue: IntroCountdownValue;
  solutionWords: string[];
  courtSize?: CourtSize;
};

function wordPhaseTypographyClass(compact: boolean, useSmSize: boolean): string {
  if (compact) {
    return 'text-xl tracking-[0.1em]';
  }
  return useSmSize
    ? 'text-3xl tracking-[0.12em]'
    : 'text-2xl tracking-[0.12em]';
}

function SpeechBubble({
  text,
  visible,
  emphasize,
  compact,
  minWidthPx,
}: {
  text: string;
  visible: boolean;
  emphasize?: boolean;
  compact?: boolean;
  minWidthPx?: number;
}) {
  const defaultMaxClass = compact ? 'max-w-[min(100%,16rem)]' : 'max-w-[min(100%,22rem)]';

  return (
    <div
      className={[
        'word-soup-intro-bubble relative rounded-[1.75rem] border-[3px] border-teal-700 bg-white shadow-[4px_6px_0_rgba(15,118,110,0.25)] transition-all duration-300',
        minWidthPx ? 'w-max max-w-full' : `w-full ${defaultMaxClass}`,
        compact ? 'px-3 py-2.5' : 'px-5 py-4',
        visible ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-2 scale-95 opacity-0',
      ].join(' ')}
      style={minWidthPx ? { minWidth: `${minWidthPx}px` } : undefined}
      aria-hidden={!visible}
    >
      <p
        className={[
          'min-h-[1.5em] text-center font-bold leading-snug text-teal-950',
          emphasize ? 'whitespace-nowrap' : 'break-words whitespace-pre-wrap',
          emphasize
            ? compact
              ? 'text-xl tracking-[0.1em]'
              : 'text-2xl tracking-[0.12em] sm:text-3xl'
            : compact
              ? 'text-sm'
              : 'text-base sm:text-lg',
        ].join(' ')}
        aria-live="polite"
        aria-atomic="true"
      >
        <span>{text}</span>
        {visible && (
          <span className="word-soup-intro-caret ml-0.5 inline-block align-baseline text-teal-500">
            ▌
          </span>
        )}
      </p>
      <span
        className="absolute left-1/2 top-full -mt-px -translate-x-1/2"
        aria-hidden="true"
      >
        <span className="block h-0 w-0 border-x-[14px] border-t-[16px] border-x-transparent border-t-teal-700" />
        <span className="absolute left-1/2 top-0 -translate-x-1/2 border-x-[11px] border-t-[13px] border-x-transparent border-t-white" />
      </span>
    </div>
  );
}

function useIntroBubbleMinWidth(
  longestWord: string,
  compact: boolean,
): {
  minWidthPx: number | undefined;
  setMeasureEl: (el: HTMLSpanElement | null) => void;
  useSmSize: boolean;
} {
  const [minWidthPx, setMinWidthPx] = useState<number | undefined>();
  const [useSmSize, setUseSmSize] = useState(false);
  const [measureEl, setMeasureEl] = useState<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(min-width: 640px)');
    const sync = () => setUseSmSize(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useLayoutEffect(() => {
    if (!longestWord || !measureEl) {
      setMinWidthPx(undefined);
      return;
    }
    const textWidth = measureEl.getBoundingClientRect().width;
    setMinWidthPx(Math.ceil(textWidth + introBubbleHorizontalInset(compact)));
  }, [longestWord, compact, useSmSize, measureEl]);

  return { minWidthPx, setMeasureEl, useSmSize };
}

export default function WordSoupIntroOverlay({
  phase,
  bubbleText,
  bubbleVisible,
  wordRevealIndex,
  totalWords,
  countdownValue,
  solutionWords,
  courtSize = 'L',
}: WordSoupIntroOverlayProps) {
  const isWordPhase = phase === 'word' || phase === 'word-gap';
  const isCountdown = phase === 'countdown';
  const compact = courtSize === 'S';
  const longestWord = longestSolutionWord(solutionWords);
  const { minWidthPx, setMeasureEl, useSmSize } = useIntroBubbleMinWidth(
    longestWord,
    compact,
  );

  return (
    <div className="word-soup-intro-overlay absolute inset-0 z-30 flex flex-col items-center justify-center overflow-x-auto overflow-y-auto overscroll-contain rounded-2xl bg-gradient-to-b from-teal-900/92 via-emerald-900/90 to-teal-950/95 px-2 py-2 backdrop-blur-md sm:px-4 sm:py-3">
      {longestWord ? (
        <span
          ref={setMeasureEl}
          aria-hidden
          className={[
            'pointer-events-none invisible absolute whitespace-nowrap font-bold',
            wordPhaseTypographyClass(compact, useSmSize),
          ].join(' ')}
        >
          {longestWord}
        </span>
      ) : null}

      {isCountdown && countdownValue !== null ? (
        <div
          key={String(countdownValue)}
          className={[
            'word-soup-intro-countdown flex flex-col items-center',
            compact ? 'gap-1.5' : 'gap-3',
          ].join(' ')}
        >
          <SoupHostCharacter
            animated
            className={compact ? 'h-16 w-16' : 'h-28 w-28 sm:h-36 sm:w-36'}
          />
          {countdownValue !== 'GO!' && (
            <p
              className={[
                'font-semibold uppercase text-teal-100/85',
                compact ? 'text-[10px] tracking-[0.16em]' : 'text-sm tracking-[0.22em]',
              ].join(' ')}
            >
              Starting in
            </p>
          )}
          <p
            className={[
              'font-black tabular-nums text-white drop-shadow-lg',
              countdownValue === 'GO!'
                ? compact
                  ? 'text-3xl tracking-[0.16em]'
                  : 'text-5xl tracking-[0.2em] sm:text-6xl'
                : compact
                  ? 'text-5xl'
                  : 'text-7xl sm:text-8xl',
            ].join(' ')}
          >
            {countdownValue}
          </p>
        </div>
      ) : (
        <div
          className={[
            'flex w-full max-w-full flex-col items-center',
            compact ? 'gap-2' : 'gap-5',
          ].join(' ')}
        >
          <SpeechBubble
            text={bubbleText}
            visible={bubbleVisible}
            emphasize={isWordPhase}
            compact={compact}
            minWidthPx={minWidthPx}
          />
          <SoupHostCharacter
            animated
            className={compact ? 'h-16 w-16' : 'h-28 w-28 sm:h-36 sm:w-36'}
          />
          {isWordPhase && totalWords > 0 && (
            <p
              className={[
                'font-semibold uppercase text-teal-100/80',
                compact ? 'text-[10px] tracking-[0.16em]' : 'text-xs tracking-[0.22em]',
              ].join(' ')}
            >
              Word {Math.min(wordRevealIndex + 1, totalWords)} of {totalWords}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
