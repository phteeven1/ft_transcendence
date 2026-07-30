'use client';

import { useEffect, useState } from 'react';

import { formatDurationMs } from '@/lib/format-duration';

type GameClockProps = {
  /** Epoch ms when the play clock should start. Null = not ready. */
  startedAtMs: number | null;
  /** When true, freeze the displayed elapsed time. */
  stopped?: boolean;
  className?: string;
  label?: string;
  width?: string;
};

/**
 * Live elapsed play clock. Shows 0:00 until `startedAtMs`, then counts up.
 */
export default function GameClock({
  startedAtMs,
  stopped = false,
  className = '',
  label = 'Time',
  width = 'w-full',
}: GameClockProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [frozenElapsed, setFrozenElapsed] = useState<number | null>(null);

  useEffect(() => {
    if (stopped) {
      if (startedAtMs != null) {
        setFrozenElapsed(Math.max(0, Date.now() - startedAtMs));
      }
      return;
    }

    setFrozenElapsed(null);
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [startedAtMs, stopped]);

  const elapsedMs =
    frozenElapsed ??
    (startedAtMs == null ? 0 : Math.max(0, nowMs - startedAtMs));

  return (
    <div
      className={[
        'inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white/90 px-3 py-1.5 shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="timer"
      aria-live="off"
      aria-label={`${label} ${formatDurationMs(elapsedMs)}`}
    >
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-teal-800/80">
        {label}
      </span>
      <span className="font-heading text-base font-bold tabular-nums text-teal-900 sm:text-lg">
        {formatDurationMs(elapsedMs)}
      </span>
    </div>
  );
}
