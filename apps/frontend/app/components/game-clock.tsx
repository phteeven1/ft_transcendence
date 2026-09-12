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
  /**
   * When true, omits the default pill chrome (border/background/padding/
   * shadow) so the clock can sit directly inside a caller-provided container
   * without a chip-in-a-chip look. Timer behavior is unaffected either way.
   */
  bare?: boolean;
};

/**
 * Live elapsed play clock. Shows 0:00 until `startedAtMs`, then counts up.
 */
export default function GameClock({
  startedAtMs,
  stopped = false,
  className = '',
  label = 'Time',
  bare = false,
}: GameClockProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (stopped || startedAtMs == null) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [startedAtMs, stopped]);

  const elapsedMs =
    startedAtMs == null ? 0 : Math.max(0, nowMs - startedAtMs);

  return (
    <div
      className={[
        'inline-flex items-center gap-2',
        bare ? '' : 'rounded-xl border border-teal-200 bg-white/90 px-3 py-1.5 shadow-sm',
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
