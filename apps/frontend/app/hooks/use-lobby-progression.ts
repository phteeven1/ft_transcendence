'use client';

import { useEffect, useState, useCallback } from 'react';

import { progressionApi } from '@/lib/api';
import type {
  LeaderboardEntryDto,
  PlayerGroupStatsDto,
  PlayerProgressionResponseDto,
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
  myProgression: PlayerProgressionResponseDto | null;
  loading: boolean;
  error: string | null;
  equipping: boolean;
  equipError: string | null;
  equipAvatar: (tier: number) => Promise<void>;
};

function applyEquippedTier(
  playerId: number,
  avatarTier: number,
  leaderboard: LeaderboardEntryDto[],
  myStats: PlayerGroupStatsDto | null,
): {
  leaderboard: LeaderboardEntryDto[];
  myStats: PlayerGroupStatsDto | null;
} {
  return {
    leaderboard: leaderboard.map((entry) =>
      entry.playerId === playerId ? { ...entry, avatarTier } : entry,
    ),
    myStats: myStats
      ? { ...myStats, avatarTier }
      : myStats,
  };
}

export function useLobbyProgression({
  groupId,
  playerId,
  enabled,
  refreshToken,
}: UseLobbyProgressionArgs): LobbyProgressionState {
  const [state, setState] = useState<{
    leaderboard: LeaderboardEntryDto[];
    myStats: PlayerGroupStatsDto | null;
    myProgression: PlayerProgressionResponseDto | null;
    loading: boolean;
    error: string | null;
    equipping: boolean;
    equipError: string | null;
  }>({
    leaderboard: [],
    myStats: null,
    myProgression: null,
    loading: false,
    error: null,
    equipping: false,
    equipError: null,
  });

  useEffect(() => {
    if (!enabled || !groupId || !playerId) return;

    let cancelled = false;

    async function fetchProgression() {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        equipError: null,
      }));

      try {
        const [leaderboard, groupStats, myProgression] = await Promise.all([
          progressionApi.getLeaderboard(groupId),
          progressionApi.getGroupStats(groupId),
          progressionApi.getMyProgression(),
        ]);

        if (cancelled) return;

        const myStats =
          groupStats.players.find((entry) => entry.playerId === playerId) ??
          null;

        setState((prev) => ({
          ...prev,
          leaderboard: leaderboard.entries,
          myStats,
          myProgression,
          loading: false,
          error: null,
        }));
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

  const equipAvatar = useCallback(
    async (tier: number) => {
      setState((prev) => ({ ...prev, equipping: true, equipError: null }));
      try {
        const myProgression = await progressionApi.equipAvatar({
          avatarTier: tier,
        });
        setState((prev) => {
          const synced = applyEquippedTier(
            playerId,
            myProgression.avatarTier,
            prev.leaderboard,
            prev.myStats,
          );
          return {
            ...prev,
            ...synced,
            myProgression,
            equipping: false,
            equipError: null,
          };
        });
      } catch (error) {
        console.error('Failed to equip avatar tier', error);
        setState((prev) => ({
          ...prev,
          equipping: false,
          equipError: 'equipFailed',
        }));
      }
    },
    [playerId],
  );

  return {
    ...state,
    equipAvatar,
  };
}
