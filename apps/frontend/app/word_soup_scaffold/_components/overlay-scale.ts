import type { CourtSize } from './court-size';

/** Shared visual scale for intro/outro overlays so S/M/L keep the same relative layout. */
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

export function getOverlayScale(courtSize: CourtSize): OverlayScale {
  if (courtSize === 'S') {
    return {
      hostClass: 'h-11 w-11',
      bubblePadClass: 'px-2 py-1.5',
      bubbleTextClass: 'text-xs',
      bubbleWordTextClass: 'text-sm tracking-[0.06em]',
      bubbleMaxWidthClass: 'max-w-full',
      outroBubbleHeightClass: 'h-[3.25rem]',
      countdownPadClass: 'px-2 py-1.5',
      countdownMaxWidthClass: 'max-w-full',
      countdownHeightClass: 'h-[3.75rem]',
      countdownNumberClass: 'text-3xl',
      countdownGoClass: 'text-2xl tracking-[0.12em]',
      labelClass: 'text-[9px] tracking-[0.14em]',
      overlayPadClass: 'px-1.5 py-1',
      stackGapClass: 'gap-1',
      bubbleTailPadClass: 'pb-3.5',
      scorePadClass: 'p-1.5',
      scoreRowClass: 'gap-1.5 px-1.5 py-1',
      scoreAvatarClass: 'h-6 w-6',
      buttonClass: 'px-3 py-1.5 text-[11px]',
      bubbleInsetPx: 16 + 6 + 8,
    };
  }

  if (courtSize === 'M') {
    return {
      hostClass: 'h-20 w-20',
      bubblePadClass: 'px-4 py-3',
      bubbleTextClass: 'text-sm',
      bubbleWordTextClass: 'text-xl tracking-[0.1em]',
      bubbleMaxWidthClass: 'max-w-[min(100%,20rem)]',
      outroBubbleHeightClass: 'h-[4.5rem]',
      countdownPadClass: 'px-3 py-2',
      countdownMaxWidthClass: 'max-w-[11rem]',
      countdownHeightClass: 'h-[4.75rem]',
      countdownNumberClass: 'text-4xl',
      countdownGoClass: 'text-3xl tracking-[0.14em]',
      labelClass: 'text-[10px] tracking-[0.18em]',
      overlayPadClass: 'px-3 py-2',
      stackGapClass: 'gap-2',
      bubbleTailPadClass: 'pb-4',
      scorePadClass: 'p-2.5',
      scoreRowClass: 'gap-2 px-2.5 py-1.5',
      scoreAvatarClass: 'h-8 w-8',
      buttonClass: 'px-5 py-2 text-xs',
      bubbleInsetPx: 32 + 6 + 10,
    };
  }

  return {
    hostClass: 'h-24 w-24',
    bubblePadClass: 'px-5 py-4',
    bubbleTextClass: 'text-base',
    bubbleWordTextClass: 'text-2xl tracking-[0.12em]',
    bubbleMaxWidthClass: 'max-w-[min(100%,22rem)]',
    outroBubbleHeightClass: 'h-[5.75rem]',
    countdownPadClass: 'px-4 py-2.5',
    countdownMaxWidthClass: 'max-w-[12rem]',
    countdownHeightClass: 'h-[5.25rem]',
    countdownNumberClass: 'text-5xl',
    countdownGoClass: 'text-4xl tracking-[0.16em]',
    labelClass: 'text-xs tracking-[0.22em]',
    overlayPadClass: 'px-4 py-3',
    stackGapClass: 'gap-3',
    bubbleTailPadClass: 'pb-4',
    scorePadClass: 'p-3 sm:p-4',
    scoreRowClass: 'gap-3 px-3 py-2.5',
    scoreAvatarClass: 'h-10 w-10',
    buttonClass: 'px-6 py-2.5 text-sm',
    bubbleInsetPx: 40 + 6 + 12,
  };
}
