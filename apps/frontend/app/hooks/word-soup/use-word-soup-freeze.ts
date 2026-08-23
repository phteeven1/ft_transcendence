'use client';

import { useEffect, useMemo, useState } from 'react';
import type { WordSoupFreezeNoticeDto } from '@/lib/api/games/word-soup/types';
import type { IPlayerLeftNoticeDto } from '@/lib/api/games/types';

interface IUseWordSoupFreezeArgs {
  playerId: number;
  frozenPlayers: Record<number, number>;
  freezeNotice: WordSoupFreezeNoticeDto | null;
  playerLeftNotice?: IPlayerLeftNoticeDto | null;
}

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
}: IUseWordSoupFreezeArgs) {
  const [now, setNow] = useState<number | null>(null);
  const [latestFreezeNotice, setLatestFreezeNotice] =
    useState<WordSoupFreezeNoticeDto | null>(null);
  const [latestPlayerLeft, setLatestPlayerLeft] = useState<{
    playerId: number;
    playerName: string;
  } | null>(null);

  if (freezeNotice != null && freezeNotice !== latestFreezeNotice) {
    setLatestFreezeNotice(freezeNotice);
  }

  if (playerLeftNotice != null && playerLeftNotice !== latestPlayerLeft) {
    setLatestPlayerLeft(playerLeftNotice);
  }

  const frozenUntil = frozenPlayers[playerId] ?? 0;
  const freezeSecondsByPlayer = useMemo(
    () => (now == null ? {} : computeFreezeSecondsMap(frozenPlayers, now)),
    [frozenPlayers, now],
  );
  const isLocalPlayerFrozen = now != null && frozenUntil > now;
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
    const tick = () => setNow(Date.now());
    const timeoutId = window.setTimeout(tick, 0);
    const intervalId = window.setInterval(tick, 250);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [frozenPlayersKey]);

  return {
    isLocalPlayerFrozen,
    freezeSecondsLeft,
    freezeSecondsByPlayer,
    latestFreezeNotice,
    latestPlayerLeft,
  };
}
