'use client';

import { useTranslations } from 'next-intl';
import {
  GameOverlayShell,
  HostSpeechStack,
  OVERLAY_SCALE,
  SpeechBubble,
} from '@/app/components/game/overlay';
import { Icon } from '@/app/components/ui';

type WordBuildingFinalLetterOverlayProps = {
  playerName: string;
  hostTier?: number;
  hostAnimal?: number;
  hostClothesColor?: string;
};

export default function WordBuildingFinalLetterOverlay({
  playerName,
  hostTier = 0,
  hostAnimal = 0,
  hostClothesColor,
}: WordBuildingFinalLetterOverlayProps) {
  const t = useTranslations('games.wordBuilding.finalLetter');
  const announcement = t('announcement', { name: playerName });

  return (
    <GameOverlayShell role="status" ariaLabel={announcement}>
      <div
        className={[
          'flex h-full w-full flex-col items-center justify-center',
          OVERLAY_SCALE.overlayPadClass,
          OVERLAY_SCALE.stackGapClass,
        ].join(' ')}
      >
        <Icon
          name="confetti"
          size={32}
          weight="fill"
          className="shrink-0 text-amber-300"
        />
        <HostSpeechStack
          bubble={<SpeechBubble text={announcement} showCaret={false} />}
          hostTier={hostTier}
          hostAnimal={hostAnimal}
          hostClothesColor={hostClothesColor}
        />
        <p className="max-w-[22rem] text-center text-xs font-medium text-teal-100/80 sm:text-sm">
          {t('subtext')}
        </p>
      </div>
    </GameOverlayShell>
  );
}
