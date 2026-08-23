import { OVERLAY_SCALE } from './overlay-scale';

type CountdownValue = 3 | 2 | 1 | 'go' | null;

export type CountdownBubbleProps = {
  value: CountdownValue;
  startingInLabel: string;
  goLabel: string;
};

export function CountdownBubble({
  value,
  startingInLabel,
  goLabel,
}: CountdownBubbleProps) {
  if (value === null) return null;

  const isGo = value === 'go';

  return (
    <div
      key={String(value)}
      className={[
        'game-overlay-countdown relative mx-auto flex w-full flex-col items-center justify-center rounded-[1.75rem] border-[3px] border-teal-700 bg-white shadow-[4px_6px_0_rgba(15,118,110,0.25)]',
        OVERLAY_SCALE.countdownMaxWidthClass,
        OVERLAY_SCALE.countdownPadClass,
        OVERLAY_SCALE.countdownHeightClass,
      ].join(' ')}
    >
      <p
        className={[
          'text-center font-semibold uppercase text-teal-800/80',
          OVERLAY_SCALE.labelClass,
          isGo ? 'invisible' : '',
        ].join(' ')}
      >
        {startingInLabel}
      </p>

      <p
        className={[
          'text-center font-black tabular-nums text-teal-950',
          isGo
            ? OVERLAY_SCALE.countdownGoClass
            : OVERLAY_SCALE.countdownNumberClass,
        ].join(' ')}
      >
        {isGo ? goLabel : value}
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
