'use client';

import { useTranslations } from 'next-intl';
import HostCharacter from '@/app/components/game/host-character';
import { Icon } from '@/app/components/ui';

type Props = {
  playerName: string;
  hostTier?: number;
  hostAnimal?: number;
  hostClothesColor?: string;
};

function SpeechBubble({ text }: { text: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[min(100%,22rem)] rounded-[1.75rem] border-[3px] border-teal-700 bg-white px-4 py-3 shadow-[4px_6px_0_rgba(15,118,110,0.25)] sm:px-5 sm:py-4">
      <p className="break-words text-center text-sm font-bold leading-snug text-teal-950 lg:text-base">
        {text}
      </p>
      <span className="absolute left-1/2 top-full -mt-px -translate-x-1/2" aria-hidden="true">
        <span className="block h-0 w-0 border-x-[14px] border-t-[16px] border-x-transparent border-t-teal-700" />
        <span className="absolute left-1/2 top-0 -translate-x-1/2 border-x-[11px] border-t-[13px] border-x-transparent border-t-white" />
      </span>
    </div>
  );
}

/**
 * Transient full-screen banner shown to every player the instant the server
 * confirms the puzzle-completing letter. Bridges the gap between the last
 * correct placement and the final scoreboard so the win reads clearly instead
 * of the game seeming to end abruptly.
 */
export default function WordBuildingFinalLetterOverlay({
  playerName,
  hostTier = 0,
  hostAnimal = 0,
  hostClothesColor,
}: Props) {
  const t = useTranslations('games.wordBuilding.finalLetter');

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 overflow-hidden bg-gradient-to-b from-teal-900/92 via-emerald-900/90 to-teal-950/95 px-3 py-4 backdrop-blur-md sm:gap-4 sm:px-4 sm:py-5"
      role="status"
      aria-live="assertive"
      aria-label={t('announcement', { name: playerName })}
    >
      <Icon name="confetti" size={32} weight="fill" className="shrink-0 text-amber-300" />

      <div className="w-full pb-4 sm:pb-5">
        <SpeechBubble text={t('announcement', { name: playerName })} />
      </div>

      <div className="shrink-0">
        <HostCharacter
          animated
          theme="animals"
          clothesColor={hostClothesColor}
          tier={hostTier}
          animal={hostAnimal}
          className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24"
        />
      </div>

      <p className="max-w-[22rem] text-center text-xs font-medium text-teal-100/80 sm:text-sm">
        {t('subtext')}
      </p>
    </div>
  );
}
