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
  equipAnimal: (animal: number) => Promise<void>;
};

function applyEquippedAvatar(
  playerId: number,
  avatarTier: number,
  avatarAnimal: number,
  leaderboard: LeaderboardEntryDto[],
  myStats: PlayerGroupStatsDto | null,
): {
  leaderboard: LeaderboardEntryDto[];
  myStats: PlayerGroupStatsDto | null;
} {
  return {
    leaderboard: leaderboard.map((entry) =>
      entry.playerId === playerId
        ? { ...entry, avatarTier, avatarAnimal }
        : entry,
    ),
    myStats: myStats
      ? { ...myStats, avatarTier, avatarAnimal }
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

    const frameId = requestAnimationFrame(() => {
      void fetchProgression();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [enabled, groupId, playerId, refreshToken]);

  const applyEquipResult = useCallback(
    (myProgression: PlayerProgressionResponseDto) => {
      setState((prev) => {
        const synced = applyEquippedAvatar(
          playerId,
          myProgression.avatarTier,
          myProgression.avatarAnimal,
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
    },
    [playerId],
  );

  const equipAnimal = useCallback(
    async (animal: number) => {
      setState((prev) => ({ ...prev, equipping: true, equipError: null }));
      try {
        const myProgression = await progressionApi.equipAvatar({
          avatarAnimal: animal,
        });
        applyEquipResult(myProgression);
      } catch (error) {
        console.error('Failed to equip avatar animal', error);
        setState((prev) => ({
          ...prev,
          equipping: false,
          equipError: 'equipFailed',
        }));
      }
    },
    [applyEquipResult],
  );

  return {
    ...state,
    equipAnimal,
  };
}
