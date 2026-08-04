'use client';

import { useEffect, useState } from 'react';

import { progressionApi } from '@/lib/api';
import type {
  LeaderboardEntryDto,
  PlayerGroupStatsDto,
} from '@/lib/api/progression';

type UseLobbyProgressionArgs = {
  groupId: number;
  playerId: number;
  enabled: boolean;
  /** Incremented on lobby:update (and optionally after returning from a game). */
  refreshToken: number;
};

type LobbyProgressionState = {
  leaderboard: LeaderboardEntryDto[];
  myStats: PlayerGroupStatsDto | null;
  loading: boolean;
  error: string | null;
};

export function useLobbyProgression({
  groupId,
  playerId,
  enabled,
  refreshToken,
}: UseLobbyProgressionArgs) {
  const [state, setState] = useState<LobbyProgressionState>({
    leaderboard: [],
    myStats: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled || !groupId || !playerId) return;

    let cancelled = false;

    async function fetchProgression() {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const [leaderboard, groupStats] = await Promise.all([
          progressionApi.getLeaderboard(groupId),
          progressionApi.getGroupStats(groupId),
        ]);

        if (cancelled) return;

        const myStats =
          groupStats.players.find((entry) => entry.playerId === playerId) ??
          null;

        setState({
          leaderboard: leaderboard.entries,
          myStats,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load lobby progression', error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'loadFailed',
        }));
      }
    }

    // Defer so setState is not synchronous in the effect body
    // (react-hooks/set-state-in-effect).
    const frameId = requestAnimationFrame(() => {
      void fetchProgression();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [enabled, groupId, playerId, refreshToken]);

  return state;
}
