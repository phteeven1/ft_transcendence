'use client';

// Clue list sections for the Word Building left-side sidebar.

import { useTranslations } from 'next-intl';
import type { ClueEntry } from '@/lib/api/games/word-building.types';

type GameInfoColumnProps = {
  cluesAcross: Omit<ClueEntry, 'word'>[];
  cluesDown:   Omit<ClueEntry, 'word'>[];
};

/**
 * Renders the Across and Down clue lists for the Word Building sidebar.
 *
 * @param cluesAcross Across clues with resolved coordinates.
 * @param cluesDown Down clues with resolved coordinates.
 */
export function GameInfoColumn({ cluesAcross, cluesDown }: GameInfoColumnProps) {
  const t = useTranslations('games.wordBuilding');

  return (
    <div className="flex flex-col gap-3 w-full text-sm">
      {cluesAcross.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700/60">
            {t('across')}
          </h3>
          <ol className="list-none space-y-1">
            {cluesAcross
              .slice()
              .sort((a, b) => a.number - b.number)
              .map(c => (
                <li key={c.number} className="flex gap-1 text-xs">
                  <span className="w-5 shrink-0 font-bold text-teal-900">{c.number}.</span>
                  <span className="text-teal-800/70">{c.clue}</span>
                </li>
              ))}
          </ol>
        </section>
      )}

      {cluesDown.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700/60">
            {t('down')}
          </h3>
          <ol className="list-none space-y-1">
            {cluesDown
              .slice()
              .sort((a, b) => a.number - b.number)
              .map(c => (
                <li key={c.number} className="flex gap-1 text-xs">
                  <span className="w-5 shrink-0 font-bold text-teal-900">{c.number}.</span>
                  <span className="text-teal-800/70">{c.clue}</span>
                </li>
              ))}
          </ol>
        </section>
      )}
    </div>
  );
}

export default GameInfoColumn;
