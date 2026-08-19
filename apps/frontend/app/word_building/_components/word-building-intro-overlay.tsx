'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import HostCharacter from '@/app/components/game/host-character';

type Props = {
  playerName: string;
  hostTier?: number;
  hostAnimal?: number;
  hostClothesColor?: string;
  onDismiss: () => void;
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

export default function WordBuildingIntroOverlay({
  playerName,
  hostTier = 0,
  hostAnimal = 0,
  hostClothesColor,
  onDismiss,
}: Props) {
  const t = useTranslations('games.wordBuilding.intro');
  
  // 5-second countdown state
  const [countdown, setCountdown] = useState(5);

  // Auto-dismiss when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      onDismiss();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, onDismiss]);

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 overflow-hidden bg-gradient-to-b from-teal-900/92 via-emerald-900/90 to-teal-950/95 px-3 py-4 backdrop-blur-md sm:gap-4 sm:px-4 sm:py-5"
      role="dialog"
      aria-modal="true"
      aria-label={t('welcome', { name: playerName })}
    >
      {/* Speech bubble */}
      <div className="w-full pb-4 sm:pb-5">
        <SpeechBubble text={t('welcome', { name: playerName })} />
      </div>

      {/* Host character */}
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

      {/* Briefing text */}
      <p className="max-w-[22rem] text-center text-xs font-medium text-teal-100/80 sm:text-sm">
        {t('briefing')}
      </p>

      {/* Countdown indicator (replaces the button) */}
      <div className="mt-1 flex h-10 items-center justify-center sm:h-12 lg:h-14">
        <span
          key={countdown} // Retriggers the pulse animation every second
          className="animate-pulse text-3xl font-black text-emerald-400 drop-shadow-md sm:text-4xl lg:text-5xl"
        >
          {countdown > 0 ? countdown : ''}
        </span>
      </div>
    </div>
  );
}