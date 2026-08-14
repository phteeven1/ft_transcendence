'use client';

import { useTranslations } from 'next-intl';
import type { CourtSize } from './court-size';
import GameRulesInfo from './game-rules-info';

type CourtControlsProps = {
  courtSize: CourtSize;
  onCourtSizeChange: (size: CourtSize) => void;
};

/** S/M/L + rules — sits to the right of the message banner. */
export default function CourtControls({
  courtSize,
  onCourtSizeChange,
}: CourtControlsProps) {
  const t = useTranslations('games.wordSoup');

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <div
        className="flex gap-1 sm:gap-1.5"
        role="group"
        aria-label={t('courtSizeLabel')}
      >
        {(['S', 'M', 'L'] as CourtSize[]).map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onCourtSizeChange(size)}
            className={[
              'h-7 w-7 rounded text-xs font-bold transition-colors sm:h-8 sm:w-8 sm:text-sm',
              courtSize === size
                ? 'bg-emerald-500 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
            ].join(' ')}
            aria-pressed={courtSize === size}
          >
            {size}
          </button>
        ))}
      </div>
      <GameRulesInfo />
    </div>
  );
}
