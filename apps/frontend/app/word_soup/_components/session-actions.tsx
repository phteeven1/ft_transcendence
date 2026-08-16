'use client';

import { useTranslations } from 'next-intl';
import { Button } from '../../components/ui/button';

type SessionActionsProps = {
  onLeave: () => void;
  /** Stretch to match the submit button row height. */
  fillHeight?: boolean;
};

/** Back to lobby — height-matched to Submit Guess when fillHeight. */
export default function SessionActions({
  onLeave,
  fillHeight = false,
}: SessionActionsProps) {
  const t = useTranslations('games.controls');

  return (
    <div
      className={[
        'flex w-full flex-col gap-1.5',
        fillHeight ? 'h-full' : '',
      ].join(' ')}
    >
      <Button
        variant="primary"
        size="sm"
        fullWidth
        onClick={onLeave}
        className={fillHeight ? 'min-h-0 flex-1' : ''}
      >
        {t('backToLobby')}
      </Button>
    </div>
  );
}
