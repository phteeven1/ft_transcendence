'use client';

import { useEffect, useMemo, useState } from 'react';

import type { WordSoup } from '@/lib/api/games/word-soup/types';

type UseWordSoupFreezeArgs = {
  playerId: number;
  frozenPlayers: Record<number, number>;
  freezeNotice: WordSoup.FreezeNoticeDto | null;
  playerLeftNotice?: { playerId: number; playerName: string } | null;
};

function computeFreezeSecondsMap(
  frozenPlayers: Record<number, number>,
  now: number,
): Record<number, number> {
  const next: Record<number, number> = {};
  for (const [id, until] of Object.entries(frozenPlayers)) {
    const remainingMs = until - now;
    if (remainingMs > 0) {
      next[Number(id)] = Math.ceil(remainingMs / 1000);
    }
  }
  return next;
}

export function useWordSoupFreeze({
  playerId,
  frozenPlayers,
  freezeNotice,
  playerLeftNotice = null,
}: UseWordSoupFreezeArgs) {
  const [statusBanner, setStatusBanner] = useState('');
  const [freezeSecondsByPlayer, setFreezeSecondsByPlayer] = useState<Record<number, number>>({});

  const frozenUntil = frozenPlayers[playerId] ?? 0;
  const isLocalPlayerFrozen = frozenUntil > Date.now();
  const freezeSecondsLeft = freezeSecondsByPlayer[playerId] ?? 0;

  const frozenPlayersKey = useMemo(
    () =>
      Object.entries(frozenPlayers)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([id, until]) => `${id}:${until}`)
        .join('|'),
    [frozenPlayers],
  );

  useEffect(() => {
    const tick = () => {
      const next = computeFreezeSecondsMap(frozenPlayers, Date.now());
      setFreezeSecondsByPlayer((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (
          prevKeys.length === nextKeys.length &&
          nextKeys.every((key) => prev[Number(key)] === next[Number(key)])
        ) {
          return prev;
        }
        return next;
      });
    };

    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [frozenPlayersKey, frozenPlayers]);

  useEffect(() => {
    if (!freezeNotice) return;

    setStatusBanner(freezeNotice.message);
    const timeoutId = window.setTimeout(() => setStatusBanner(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [freezeNotice]);

  useEffect(() => {
    if (!playerLeftNotice) return;

    setStatusBanner(`${playerLeftNotice.playerName} left the game`);
    const timeoutId = window.setTimeout(() => setStatusBanner(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [playerLeftNotice]);

  return {
    isLocalPlayerFrozen,
    freezeSecondsLeft,
    freezeSecondsByPlayer,
    statusBanner,
  };
}
