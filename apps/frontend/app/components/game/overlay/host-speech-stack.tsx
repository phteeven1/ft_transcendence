import type { ReactNode } from 'react';
import HostCharacter from '@/app/components/game/host-character';
import { OVERLAY_SCALE } from './overlay-scale';

export type HostSpeechStackProps = {
  bubble: ReactNode;
  hostTier?: number;
  hostAnimal?: number;
  hostClothesColor?: string;
  hostClassName?: string;
};

export function HostSpeechStack({
  bubble,
  hostTier = 0,
  hostAnimal = 0,
  hostClothesColor,
  hostClassName = OVERLAY_SCALE.hostClass,
}: HostSpeechStackProps) {
  return (
    <div className="flex w-full shrink-0 flex-col items-center">
      <div
        className={[
          'relative z-10 w-full',
          OVERLAY_SCALE.bubbleMaxWidthClass,
          OVERLAY_SCALE.bubbleTailPadClass,
        ].join(' ')}
      >
        {bubble}
      </div>

      <div className="relative z-0 shrink-0">
        <HostCharacter
          animated
          theme="animals"
          clothesColor={hostClothesColor}
          tier={hostTier}
          animal={hostAnimal}
          className={hostClassName}
        />
      </div>
    </div>
  );
}
