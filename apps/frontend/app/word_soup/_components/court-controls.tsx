'use client';

import GameRulesInfo from './game-rules-info';

/** Rules control — sits to the right of the message banner. */
export default function CourtControls() {
  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      <GameRulesInfo />
    </div>
  );
}
