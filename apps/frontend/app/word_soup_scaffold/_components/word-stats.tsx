'use client';

import { useTranslations } from 'next-intl';

type WordStatsProps = {
  totalWords: number;
  wordsFound: number;
  wordsLeft: number;
};

/** Total / Found / Left — bottom aligns with the court. */
export default function WordStats({ totalWords, wordsFound, wordsLeft }: WordStatsProps) {
  const t = useTranslations('games.wordSoup');

  return (
    <section className="w-full space-y-1.5 text-sm text-teal-900/80">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-700/60">
        {t('wordsHeading')}
      </h2>
      <dl className="space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs text-teal-800/55">{t('statsTotal')}</dt>
          <dd className="font-semibold tabular-nums text-teal-900">{totalWords}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs text-teal-800/55">{t('statsFound')}</dt>
          <dd className="font-semibold tabular-nums text-teal-900">{wordsFound}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-xs text-teal-800/55">{t('statsLeft')}</dt>
          <dd className="font-semibold tabular-nums text-teal-900">{wordsLeft}</dd>
        </div>
      </dl>
    </section>
  );
}
