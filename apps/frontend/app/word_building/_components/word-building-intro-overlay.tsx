'use client';

import { useTranslations } from 'next-intl';
import {
  CountdownBubble,
  GameOverlayShell,
  HostSpeechStack,
  OVERLAY_SCALE,
  SpeechBubble,
} from '@/app/components/game/overlay';
import type {
  IntroCountdownValue,
  IntroPhase,
} from '@/app/hooks/game/use-game-intro';

type WordBuildingIntroOverlayProps = {
  phase: IntroPhase;
  bubbleText: string;
  bubbleVisible: boolean;
  countdownValue: IntroCountdownValue;
  hostTier?: number;
  hostAnimal?: number;
  hostClothesColor?: string;
};

export default function WordBuildingIntroOverlay({
  phase,
  bubbleText,
  bubbleVisible,
  countdownValue,
  hostTier = 0,
  hostAnimal = 0,
  hostClothesColor,
}: WordBuildingIntroOverlayProps) {
  const t = useTranslations('games.wordBuilding.intro');
  const bubble =
    phase === 'countdown' && countdownValue !== null ? (
      <CountdownBubble
        value={countdownValue}
        startingInLabel={t('startingIn')}
        goLabel={t('go')}
      />
    ) : (
      <SpeechBubble text={bubbleText} visible={bubbleVisible} />
    );

  return (
    <GameOverlayShell
      role="dialog"
      ariaModal
      ariaLabel={bubbleText || t('briefing')}
    >
      <div
        className={[
          'flex h-full w-full flex-col items-center justify-center',
          OVERLAY_SCALE.overlayPadClass,
        ].join(' ')}
      >
        <HostSpeechStack
          bubble={bubble}
          hostTier={hostTier}
          hostAnimal={hostAnimal}
          hostClothesColor={hostClothesColor}
        />
      </div>
    </GameOverlayShell>
  );
}
