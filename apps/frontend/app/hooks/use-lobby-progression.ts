'use client';

import { useCallback, useEffect, useState } from 'react';

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

  const fetchProgression = useCallback(async () => {
    if (!enabled || !groupId || !playerId) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const [leaderboard, groupStats] = await Promise.all([
        progressionApi.getLeaderboard(groupId),
        progressionApi.getGroupStats(groupId),
      ]);

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
      console.error('Failed to load lobby progression', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'loadFailed',
      }));
    }
  }, [enabled, groupId, playerId]);

  useEffect(() => {
    void fetchProgression();
  }, [fetchProgression, refreshToken]);

  return state;
}
