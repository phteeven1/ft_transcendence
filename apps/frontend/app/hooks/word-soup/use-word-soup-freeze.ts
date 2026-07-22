'use client';

import { useEffect, useMemo, useState } from 'react';

import type { WordSoup } from '@/lib/api/games/word-soup/types';

type UseWordSoupFreezeArgs = {
  playerId: number;
  frozenPlayers: Record<number, number>;
  freezeNotice: WordSoup.FreezeNoticeDto | null;
};

export function useWordSoupFreeze({
  playerId,
  frozenPlayers,
  freezeNotice,
}: UseWordSoupFreezeArgs) {
  const [statusBanner, setStatusBanner] = useState('');
  const [freezeSecondsLeft, setFreezeSecondsLeft] = useState(0);

  const frozenUntil = frozenPlayers[playerId] ?? 0;
  const isLocalPlayerFrozen = frozenUntil > Date.now();

  const frozenUntilKey = useMemo(
    () => frozenUntil,
    [frozenUntil],
  );

  useEffect(() => {
    const tick = () => {
      const remainingMs = frozenUntilKey - Date.now();
      const next = remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
      setFreezeSecondsLeft((prev) => (prev === next ? prev : next));
    };

    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [frozenUntilKey, playerId]);

  useEffect(() => {
    if (!freezeNotice) return;

    setStatusBanner(freezeNotice.message);
    const timeoutId = window.setTimeout(() => setStatusBanner(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [freezeNotice]);

  return {
    isLocalPlayerFrozen,
    freezeSecondsLeft,
    statusBanner,
  };
}
