'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/app/components/ui';

const HOW_TO_PLAY_KEYS = ['howToPlay1', 'howToPlay2', 'howToPlay3'] as const;
const RULES_KEYS = ['rules1', 'rules2', 'rules3', 'rules4', 'rules5'] as const;

export default function GameRulesInfo() {
  const t = useTranslations('games.wordSoup.rules');
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={[
          'inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition',
          open
            ? 'border-emerald-500 bg-emerald-600 text-white'
            : 'border-emerald-300 bg-white/90 text-emerald-800 hover:bg-emerald-50',
        ].join(' ')}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t('hide') : t('show')}
        title={t('title')}
      >
        <Icon name="info" size={20} />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-emerald-200 bg-white p-4 text-sm text-gray-700 shadow-lg"
        >
          <p className="font-semibold text-emerald-800">{t('howToPlay')}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {HOW_TO_PLAY_KEYS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
          <p className="font-semibold text-emerald-800">{t('rulesHeading')}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {RULES_KEYS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
