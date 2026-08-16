'use client';

import { useTranslations } from 'next-intl';
import { Button } from '../../components/ui/button';

interface Props {
  onLeave: () => void;
}

/**
 * Renders the control for returning to the lobby.
 *
 * @param onLeave Callback for opening the back-to-lobby confirm.
 */
export default function GameControls({ onLeave }: Props) {
  const t = useTranslations('games.controls');

  return (
    <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-gray-300">
      <Button variant="primary" fullWidth onClick={onLeave}>
        {t('backToLobby')}
      </Button>
    </div>
  );
}
