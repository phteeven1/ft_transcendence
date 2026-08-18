'use client';

import { useTranslations } from 'next-intl';
import { Button } from '../../components/ui/button';

interface Props {
  onLeave: () => void;
}

/** Back-to-lobby button for the Word Building left panel. */
export default function GameControls({ onLeave }: Props) {
  const t = useTranslations('games.controls');

  return (
    <div className="flex w-full flex-col gap-1.5">
      <Button variant="primary" size="sm" fullWidth onClick={onLeave}>
        {t('backToLobby')}
      </Button>
    </div>
  );
}
