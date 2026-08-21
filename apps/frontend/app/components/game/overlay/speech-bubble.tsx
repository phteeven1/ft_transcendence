import type { ReactNode } from 'react';
import { OVERLAY_SCALE } from './overlay-scale';

export type SpeechBubbleTail = 'bottom' | 'left' | 'none';

export type SpeechBubbleProps = {
  text?: string;
  visible?: boolean;
  emphasize?: boolean;
  wordScale?: number;
  fixedHeight?: boolean;
  showCaret?: boolean;
  /** Default bottom caret (host below). Event banner uses left. */
  tail?: SpeechBubbleTail;
  className?: string;
  children?: ReactNode;
};

export function SpeechBubbleCaret(): ReactNode {
  return (
    <span className="game-overlay-caret ml-0.5 inline-block align-baseline text-teal-500">
      ▌
    </span>
  );
}

function BubbleTail({ tail }: { tail: SpeechBubbleTail }) {
  if (tail === 'none') return null;

  if (tail === 'left') {
    return (
      <span
        className="absolute right-full top-5 -translate-y-1/2 sm:top-6"
        aria-hidden="true"
      >
        <span className="block h-0 w-0 border-y-[11px] border-r-[14px] border-y-transparent border-r-teal-700" />
        <span className="absolute left-[3px] top-1/2 -translate-y-1/2 border-y-[8px] border-r-[10px] border-y-transparent border-r-white" />
      </span>
    );
  }

  return (
    <span
      className="absolute left-1/2 top-full -mt-px -translate-x-1/2"
      aria-hidden="true"
    >
      <span className="block h-0 w-0 border-x-[14px] border-t-[16px] border-x-transparent border-t-teal-700" />
      <span className="absolute left-1/2 top-0 -translate-x-1/2 border-x-[11px] border-t-[13px] border-x-transparent border-t-white" />
    </span>
  );
}

export function SpeechBubble({
  text = '',
  visible = true,
  emphasize = false,
  wordScale = 1,
  fixedHeight = false,
  showCaret,
  tail = 'bottom',
  className = '',
  children,
}: SpeechBubbleProps) {
  const shouldShowCaret = visible && (showCaret ?? true) && children == null;

  return (
    <div
      className={[
        'relative flex items-center border-[3px] border-teal-700 bg-white transition-opacity duration-300',
        tail === 'left'
          ? 'min-h-14 w-full rounded-2xl px-3 py-2 shadow-[3px_4px_0_rgba(15,118,110,0.22)] sm:min-h-16 sm:px-4'
          : [
              'mx-auto w-full justify-center rounded-[1.75rem] shadow-[4px_6px_0_rgba(15,118,110,0.25)]',
              OVERLAY_SCALE.bubbleMaxWidthClass,
              OVERLAY_SCALE.bubblePadClass,
              fixedHeight ? OVERLAY_SCALE.outroBubbleHeightClass : '',
            ].join(' '),
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
        className,
      ].join(' ')}
      aria-hidden={!visible}
    >
      {children ?? (
        <p
          className={[
            'min-h-[1.5em] w-full text-center font-bold leading-snug text-teal-950',
            emphasize
              ? `whitespace-nowrap ${OVERLAY_SCALE.bubbleWordTextClass}`
              : `break-words whitespace-pre-wrap ${OVERLAY_SCALE.bubbleTextClass}`,
            fixedHeight ? 'line-clamp-3' : '',
          ].join(' ')}
          style={
            emphasize && wordScale < 1
              ? {
                  transform: `scale(${wordScale})`,
                  transformOrigin: 'center',
                }
              : undefined
          }
          aria-live="polite"
          aria-atomic="true"
        >
          <span>{text}</span>
          {shouldShowCaret ? <SpeechBubbleCaret /> : null}
        </p>
      )}

      <BubbleTail tail={tail} />
    </div>
  );
}
