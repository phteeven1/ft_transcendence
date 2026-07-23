'use client';

import type { IntroCountdownValue, IntroPhase } from '@/app/hooks/word-soup/use-word-soup-intro';
import SoupHostCharacter from './soup-host-character';

type WordSoupIntroOverlayProps = {
  phase: IntroPhase;
  bubbleText: string;
  bubbleVisible: boolean;
  wordRevealIndex: number;
  totalWords: number;
  countdownValue: IntroCountdownValue;
};

function SpeechBubble({
  text,
  visible,
  emphasize,
}: {
  text: string;
  visible: boolean;
  emphasize?: boolean;
}) {
  return (
    <div
      className={[
        'word-soup-intro-bubble relative max-w-[min(100%,22rem)] rounded-[1.75rem] border-[3px] border-teal-700 bg-white px-5 py-4 shadow-[4px_6px_0_rgba(15,118,110,0.25)] transition-all duration-300',
        visible ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-2 scale-95 opacity-0',
      ].join(' ')}
      aria-hidden={!visible}
    >
      <p
        className={[
          'min-h-[1.5em] text-center font-bold leading-snug text-teal-950',
          emphasize ? 'text-2xl tracking-[0.12em] sm:text-3xl' : 'text-base sm:text-lg',
        ].join(' ')}
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

export default function WordSoupIntroOverlay({
  phase,
  bubbleText,
  bubbleVisible,
  wordRevealIndex,
  totalWords,
  countdownValue,
}: WordSoupIntroOverlayProps) {
  const isWordPhase = phase === 'word' || phase === 'word-gap';
  const isCountdown = phase === 'countdown';

  return (
    <div className="word-soup-intro-overlay absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-teal-900/92 via-emerald-900/90 to-teal-950/95 px-4 backdrop-blur-md">
      {isCountdown && countdownValue !== null ? (
        <div
          key={String(countdownValue)}
          className="word-soup-intro-countdown flex flex-col items-center gap-3"
        >
          <SoupHostCharacter
            animated
            className="h-28 w-28 sm:h-36 sm:w-36"
          />
          {countdownValue !== 'GO!' && (
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-100/85">
              Starting in
            </p>
          )}
          <p
            className={[
              'font-black tabular-nums text-white drop-shadow-lg',
              countdownValue === 'GO!'
                ? 'text-5xl tracking-[0.2em] sm:text-6xl'
                : 'text-7xl sm:text-8xl',
            ].join(' ')}
          >
            {countdownValue}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <SpeechBubble
            text={bubbleText}
            visible={bubbleVisible}
            emphasize={isWordPhase}
          />
          <SoupHostCharacter
            animated
            className="h-28 w-28 sm:h-36 sm:w-36"
          />
          {isWordPhase && totalWords > 0 && (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100/80">
              Word {Math.min(wordRevealIndex + 1, totalWords)} of {totalWords}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
