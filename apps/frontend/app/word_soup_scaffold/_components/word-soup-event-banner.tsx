'use client';

import { useEffect, useState } from 'react';
import SoupHostCharacter from './soup-host-character';
import {
  getEventBannerDurations,
  type EventBannerPhase,
  type WordSoupEventBanner,
} from '@/app/hooks/word-soup/use-word-soup-event-banner';

type WordSoupEventBannerProps = {
  event: WordSoupEventBanner | null;
  phase: EventBannerPhase;
  /** Equipped avatar tier for the local player host. */
  hostTier?: number;
};

const IDLE_CLOTHES = '#5EEAD4';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function revealByProgress(
  headline: string,
  detail: string | undefined,
  progress: number,
): { headline: string; detail: string } {
  const detailText = detail ?? '';
  const total = Math.max(1, headline.length + detailText.length);
  let remaining = Math.max(0, Math.min(total, Math.round(progress * total)));
  const headlineShown = headline.slice(0, Math.min(headline.length, remaining));
  remaining -= headlineShown.length;
  const detailShown = detailText.slice(0, Math.min(detailText.length, remaining));
  return { headline: headlineShown, detail: detailShown };
}

function useRevealProgress(phase: EventBannerPhase, event: WordSoupEventBanner | null): number {
  const [progress, setProgress] = useState(0);
  const [trackedPhase, setTrackedPhase] = useState(phase);
  const [trackedEventId, setTrackedEventId] = useState(event?.id ?? null);

  const eventId = event?.id ?? null;
  if (phase !== trackedPhase || eventId !== trackedEventId) {
    setTrackedPhase(phase);
    setTrackedEventId(eventId);
    if (phase === 'idle' || !event) {
      setProgress(0);
    } else if (phase === 'hold') {
      setProgress(1);
    } else if (phase === 'enter') {
      setProgress(0);
    } else {
      setProgress(1);
    }
  }

  useEffect(() => {
    if (phase === 'idle' || !event || phase === 'hold') {
      return;
    }

    const { enterMs, exitMs } = getEventBannerDurations(event);
    const duration = phase === 'enter' ? enterMs : exitMs;
    const from = phase === 'enter' ? 0 : 1;
    const to = phase === 'enter' ? 1 : 0;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setProgress(from + (to - from) * easeInOutCubic(t));
      if (t < 1) {
        raf = window.requestAnimationFrame(tick);
      } else {
        setProgress(to);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [phase, event]);

  return progress;
}

export default function WordSoupEventBannerView({
  event,
  phase,
  hostTier = 0,
}: WordSoupEventBannerProps) {
  const progress = useRevealProgress(phase, event);
  const bubbleVisible = phase === 'enter' || phase === 'hold';
  const showCaret = phase === 'enter' && progress < 1;

  const revealed =
    event && phase !== 'idle'
      ? phase === 'exit'
        ? { headline: event.headline, detail: event.detail ?? '' }
        : revealByProgress(event.headline, event.detail, progress)
      : { headline: '', detail: '' };

  const liveMessage = [revealed.headline, revealed.detail].filter(Boolean).join(' — ');

  return (
    <div
      className="word-soup-event-ticker-slot flex h-14 w-full items-center gap-0 sm:h-16"
      role="status"
      aria-live="polite"
      aria-label={bubbleVisible ? liveMessage : 'Game message banner'}
    >
      <SoupHostCharacter
        clothesColor={event?.clothesColor ?? IDLE_CLOTHES}
        tier={hostTier}
        animated
        className="relative z-10 h-14 w-14 shrink-0 sm:h-16 sm:w-16"
        title="Word Soup host"
      />

      <div className="relative min-w-0 flex-1 self-stretch py-0.5">
        <div
          className={[
            'word-soup-event-bubble relative flex h-full min-h-0 items-center rounded-2xl border-[3px] border-teal-700 bg-white px-3 shadow-[3px_4px_0_rgba(15,118,110,0.22)] transition-all duration-300 sm:px-4',
            bubbleVisible
              ? 'translate-x-0 scale-100 opacity-100'
              : 'pointer-events-none -translate-x-1 scale-[0.98] opacity-0',
          ].join(' ')}
          aria-hidden={!bubbleVisible}
        >
          {/* Tail pointing left toward the host */}
          <span
            className="absolute right-full top-1/2 -translate-y-1/2"
            aria-hidden="true"
          >
            <span className="block h-0 w-0 border-y-[11px] border-r-[14px] border-y-transparent border-r-teal-700" />
            <span className="absolute left-[3px] top-1/2 -translate-y-1/2 border-y-[8px] border-r-[10px] border-y-transparent border-r-white" />
          </span>

          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold text-teal-950 sm:text-base">
              <span>{revealed.headline}</span>
              {showCaret && !(event?.detail && revealed.headline.length >= (event.headline.length)) && (
                <span className="word-soup-intro-caret ml-0.5 inline-block align-baseline text-teal-500">
                  ▌
                </span>
              )}
            </p>
            {event?.detail ? (
              <p className="truncate text-xs font-semibold text-teal-800/75 sm:text-sm">
                <span>{revealed.detail}</span>
                {showCaret && revealed.headline.length >= event.headline.length && (
                  <span className="word-soup-intro-caret ml-0.5 inline-block align-baseline text-teal-500">
                    ▌
                  </span>
                )}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
