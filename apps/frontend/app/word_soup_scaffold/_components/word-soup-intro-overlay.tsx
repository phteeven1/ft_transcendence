'use client';

import { useLayoutEffect, useState } from 'react';
import type { IntroCountdownValue, IntroPhase } from '@/app/hooks/word-soup/use-word-soup-intro';
import SoupHostCharacter from './soup-host-character';
import type { CourtSize } from './court-size';
import { longestSolutionWord } from './intro-bubble-width';
import { getOverlayScale } from './overlay-scale';

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

function SpeechBubble({
  text,
  visible,
  emphasize,
  scale,
  wordScale,
}: {
  text: string;
  visible: boolean;
  emphasize?: boolean;
  scale: ReturnType<typeof getOverlayScale>;
  wordScale: number;
}) {
  return (
    <div
      className={[
        'word-soup-intro-bubble relative mx-auto w-full rounded-[1.75rem] border-[3px] border-teal-700 bg-white shadow-[4px_6px_0_rgba(15,118,110,0.25)] transition-opacity duration-300',
        scale.bubbleMaxWidthClass,
        scale.bubblePadClass,
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
      aria-hidden={!visible}
    >
      <p
        className={[
          'min-h-[1.5em] text-center font-bold leading-snug text-teal-950',
          emphasize
            ? `whitespace-nowrap ${scale.bubbleWordTextClass}`
            : `break-words whitespace-pre-wrap ${scale.bubbleTextClass}`,
        ].join(' ')}
        style={
          emphasize && wordScale < 1
            ? { transform: `scale(${wordScale})`, transformOrigin: 'center' }
            : undefined
        }
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

function CountdownBubble({
  value,
  scale,
}: {
  value: IntroCountdownValue;
  scale: ReturnType<typeof getOverlayScale>;
}) {
  const isGo = value === 'GO!';

  return (
    <div
      key={String(value)}
      className={[
        'word-soup-intro-countdown word-soup-intro-bubble relative mx-auto flex w-full flex-col items-center justify-center rounded-[1.75rem] border-[3px] border-teal-700 bg-white shadow-[4px_6px_0_rgba(15,118,110,0.25)]',
        scale.countdownMaxWidthClass,
        scale.countdownPadClass,
        scale.countdownHeightClass,
      ].join(' ')}
    >
      <p
        className={[
          'text-center font-semibold uppercase text-teal-800/80',
          scale.labelClass,
          isGo ? 'invisible' : '',
        ].join(' ')}
      >
        Starting in
      </p>
      <p
        className={[
          'text-center font-black tabular-nums text-teal-950',
          isGo ? scale.countdownGoClass : scale.countdownNumberClass,
        ].join(' ')}
      >
        {value}
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

/**
 * Scale word-announcement text so the longest vocabulary word fits inside the
 * available bubble width (no horizontal scrollbar on S).
 */
function useWordFitScale(
  longestWord: string,
  typographyClass: string,
  insetPx: number,
): {
  wordScale: number;
  setSlotEl: (el: HTMLDivElement | null) => void;
  measureClassName: string;
  setMeasureEl: (el: HTMLSpanElement | null) => void;
} {
  const [wordScale, setWordScale] = useState(1);
  const [slotEl, setSlotEl] = useState<HTMLDivElement | null>(null);
  const [measureEl, setMeasureEl] = useState<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    if (!longestWord || !slotEl || !measureEl) {
      setWordScale(1);
      return;
    }

    const update = () => {
      const available = Math.max(0, slotEl.clientWidth - insetPx);
      const needed = measureEl.getBoundingClientRect().width;
      if (needed <= 0 || available <= 0) {
        setWordScale(1);
        return;
      }
      setWordScale(Math.min(1, available / needed));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(slotEl);
    return () => observer.disconnect();
  }, [longestWord, typographyClass, insetPx, slotEl, measureEl]);

  return {
    wordScale,
    setSlotEl,
    measureClassName: typographyClass,
    setMeasureEl,
  };
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
  const scale = getOverlayScale(courtSize);
  const longestWord = longestSolutionWord(solutionWords);
  const { wordScale, setSlotEl, measureClassName, setMeasureEl } = useWordFitScale(
    longestWord,
    scale.bubbleWordTextClass,
    scale.bubbleInsetPx,
  );

  return (
    <div className="word-soup-intro-overlay absolute inset-0 z-30 overflow-hidden rounded-2xl bg-gradient-to-b from-teal-900/92 via-emerald-900/90 to-teal-950/95 backdrop-blur-md">
      {longestWord ? (
        <span
          ref={setMeasureEl}
          aria-hidden
          className={[
            'pointer-events-none invisible absolute whitespace-nowrap font-bold',
            measureClassName,
          ].join(' ')}
        >
          {longestWord}
        </span>
      ) : null}

      {/* Same stacked order on S/M/L: (bubble+host) → footer */}
      <div
        className={[
          'flex h-full w-full flex-col items-center',
          scale.overlayPadClass,
          scale.stackGapClass,
        ].join(' ')}
      >
        {/* Bubble + host share one column with no flex-gap so the tail points at the host. */}
        <div className="flex min-h-0 w-full flex-[1.35] flex-col items-center justify-end">
          <div
            ref={setSlotEl}
            className={[
              'relative z-10 w-full',
              scale.bubbleMaxWidthClass,
              scale.bubbleTailPadClass,
            ].join(' ')}
          >
            {isCountdown && countdownValue !== null ? (
              <CountdownBubble value={countdownValue} scale={scale} />
            ) : (
              <SpeechBubble
                text={bubbleText}
                visible={bubbleVisible}
                emphasize={isWordPhase}
                scale={scale}
                wordScale={wordScale}
              />
            )}
          </div>
          <div className="relative z-0 shrink-0">
            <SoupHostCharacter animated className={scale.hostClass} />
          </div>
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-start overflow-hidden">
          {totalWords > 0 ? (
            <p
              className={[
                'font-semibold uppercase',
                scale.labelClass,
                isWordPhase ? 'text-teal-100/80' : 'invisible text-teal-100/80',
              ].join(' ')}
              aria-hidden={!isWordPhase}
            >
              Word {Math.min(wordRevealIndex + 1, totalWords)} of {totalWords}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
