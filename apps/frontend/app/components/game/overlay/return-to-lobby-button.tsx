import { OVERLAY_SCALE } from './overlay-scale';

export type ReturnToLobbyButtonProps = {
  showReturnButton: boolean;
  isClosing?: boolean;
  returnLabel: string;
  almostDoneLabel: string;
  onReturnToLobby: () => void;
};

export function ReturnToLobbyButton({
  showReturnButton,
  isClosing = false,
  returnLabel,
  almostDoneLabel,
  onReturnToLobby,
}: ReturnToLobbyButtonProps) {
  if (showReturnButton) {
    return (
      <button
        type="button"
        onClick={onReturnToLobby}
        className={[
          'rounded-full bg-emerald-500 font-semibold text-white shadow-[0_4px_0_#047857] transition hover:bg-emerald-400 active:translate-y-0.5 active:shadow-none',
          OVERLAY_SCALE.buttonClass,
        ].join(' ')}
      >
        {returnLabel}
      </button>
    );
  }

  if (isClosing) {
    return (
      <p
        className={[
          'text-center font-medium uppercase text-teal-100/70',
          OVERLAY_SCALE.labelClass,
        ].join(' ')}
      >
        {almostDoneLabel}
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled
      tabIndex={-1}
      aria-hidden
      className={[
        'invisible rounded-full font-semibold',
        OVERLAY_SCALE.buttonClass,
      ].join(' ')}
    >
      {returnLabel}
    </button>
  );
}
