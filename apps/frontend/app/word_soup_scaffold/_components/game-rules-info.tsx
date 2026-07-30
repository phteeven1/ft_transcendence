'use client';

import { useId, useState } from 'react';

const RULES = [
  'Select a contiguous word on the grid.',
  'Submit your guess to score points.',
  'Found words are highlighted in your player colour.',
  'Wrong guesses freeze you for a few seconds.',
  'Find two or more words in a row to start a scoring streak.',
];

export default function GameRulesInfo() {
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
        aria-label={open ? 'Hide game rules' : 'Show game rules'}
        title="Game rules"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-5" />
          <path d="M12 8h.01" />
        </svg>
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-emerald-200 bg-white p-4 text-sm text-gray-700 shadow-lg"
        >
          <p className="font-semibold text-emerald-800">Rules</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
