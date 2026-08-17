/** Shared visual scale for intro/outro overlays on the fluid square court. */
export type OverlayScale = {
  hostClass: string;
  bubblePadClass: string;
  bubbleTextClass: string;
  bubbleWordTextClass: string;
  bubbleMaxWidthClass: string;
  /** Fixed outro bubble height so 1- vs 2-line text does not move the host. */
  outroBubbleHeightClass: string;
  countdownPadClass: string;
  countdownMaxWidthClass: string;
  countdownHeightClass: string;
  countdownNumberClass: string;
  countdownGoClass: string;
  labelClass: string;
  overlayPadClass: string;
  /** Gap between major overlay sections (not between bubble and host). */
  stackGapClass: string;
  /** Space reserved under the bubble for the speech-tail; keeps host tucked under the tip. */
  bubbleTailPadClass: string;
  scorePadClass: string;
  scoreRowClass: string;
  scoreAvatarClass: string;
  buttonClass: string;
  /** Horizontal inset used when measuring word bubble width. */
  bubbleInsetPx: number;
};

export const OVERLAY_SCALE: OverlayScale = {
  hostClass: 'h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24',
  bubblePadClass: 'px-3 py-2 sm:px-4 sm:py-3 lg:px-5 lg:py-4',
  bubbleTextClass: 'text-sm lg:text-base',
  bubbleWordTextClass:
    'text-lg tracking-[0.08em] sm:text-xl sm:tracking-[0.1em] lg:text-2xl lg:tracking-[0.12em]',
  bubbleMaxWidthClass: 'max-w-[min(100%,22rem)]',
  outroBubbleHeightClass: 'h-[3.75rem] sm:h-[4.5rem] lg:h-[5.75rem]',
  countdownPadClass: 'px-3 py-2 lg:px-4 lg:py-2.5',
  countdownMaxWidthClass: 'max-w-[min(100%,12rem)]',
  countdownHeightClass: 'h-[4rem] sm:h-[4.75rem] lg:h-[5.25rem]',
  countdownNumberClass: 'text-4xl lg:text-5xl',
  countdownGoClass: 'text-3xl tracking-[0.14em] lg:text-4xl lg:tracking-[0.16em]',
  labelClass: 'text-[10px] tracking-[0.18em] lg:text-xs lg:tracking-[0.22em]',
  overlayPadClass: 'px-2 py-1.5 sm:px-3 sm:py-2 lg:px-4 lg:py-3',
  stackGapClass: 'gap-1.5 sm:gap-2 lg:gap-3',
  bubbleTailPadClass: 'pb-3.5 sm:pb-4',
  scorePadClass: 'p-2 sm:p-2.5 lg:p-4',
  scoreRowClass:
    'gap-2 px-2 py-1.5 sm:px-2.5 lg:gap-3 lg:px-3 lg:py-2.5',
  scoreAvatarClass: 'h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10',
  buttonClass: 'px-4 py-2 text-xs sm:px-5 lg:px-6 lg:py-2.5 lg:text-sm',
  bubbleInsetPx: 40 + 6 + 12,
};
