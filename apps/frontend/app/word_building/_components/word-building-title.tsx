'use client';

import { useTranslations } from 'next-intl';

type WordBuildingTitleProps = {
  solved: boolean;
};

/** Brand title card for the top-left corner above the player rail. */
export default function WordBuildingTitle({ solved }: WordBuildingTitleProps) {
  const t = useTranslations('games.wordBuilding');

  return (
    <header className="flex h-full w-full flex-col justify-center gap-1.5">
      <div className="rounded-2xl border border-emerald-200 bg-white/90 px-2.5 py-2 shadow-sm sm:px-3">
        <h1 className="font-heading text-center text-lg font-black leading-none tracking-tight text-emerald-800 sm:text-xl">
          {t('title')}
        </h1>
      </div>
      {solved && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-2 py-1 text-center text-xs font-semibold text-emerald-700 shadow-sm">
          {t('puzzleSolved')}
        </div>
      )}
    </header>
  );
}
