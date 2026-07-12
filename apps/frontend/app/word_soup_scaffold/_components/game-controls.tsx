'use client';

import { useTranslations } from 'next-intl';
import { Button } from '../../components/ui/button';

interface Props {
  onLeave: () => void;
  onGameOver: () => void;
}

export default function GameControls({ onLeave, onGameOver }: Props) {
  const t = useTranslations('games.controls');

  return (
    <div className="flex flex-col gap-3 lg:pt-12">
      <Button variant="primary" fullWidth onClick={onLeave}>
        {t('leaveGame')}
      </Button>
      <Button variant="destructive" fullWidth onClick={onGameOver}>
        {t('gameOver')}
      </Button>
    </div>
  );
}
