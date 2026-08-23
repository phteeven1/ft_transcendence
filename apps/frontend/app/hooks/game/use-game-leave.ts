'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import { gamesApi } from '@/lib/api/games';
import type { PlayerDto } from '@/lib/api/players/types';

import { returnToLobbyOnce } from './game-leave.helpers';

export interface IUseGameLeaveArgs {
  router: AppRouterInstance;
  loginAsPlayer: (player: PlayerDto) => void;
  setSessionExpiresAt: (expiresAt: number) => void;
}

type UseGameLeaveResult = {
  hasLeftForLobbyRef: RefObject<boolean>;
  handleReturnToLobby: () => void;
  leaveToLobby: (gameId: number, playerId: number) => Promise<void>;
};

/**
 * Shared leave / return-to-lobby flow for active game pages.
 * Matches Word Building behaviour: always navigate after leave, even if the
 * REST call fails (session guard prevents stale re-entry).
 */
export function useGameLeave({
  router,
  loginAsPlayer,
  setSessionExpiresAt,
}: IUseGameLeaveArgs): UseGameLeaveResult {
  const hasLeftForLobbyRef = useRef(false);

  const handleReturnToLobby = useCallback(() => {
    returnToLobbyOnce(hasLeftForLobbyRef, {
      router,
      loginAsPlayer,
      setSessionExpiresAt,
      method: 'push',
    });
  }, [router, loginAsPlayer, setSessionExpiresAt]);

  const leaveToLobby = useCallback(
    async (gameId: number, playerId: number) => {
      try {
        await gamesApi.leave({ gameId, playerId });
      } catch {
        /* navigation still wins; the session guard prevents stale re-entry */
      } finally {
        handleReturnToLobby();
      }
    },
    [handleReturnToLobby],
  );

  return {
    hasLeftForLobbyRef,
    handleReturnToLobby,
    leaveToLobby,
  };
}

/**
 * When everyone abandons mid-match, `game:finished` fires without a natural
 * solve — skip the outro and return to the lobby immediately.
 */
export function useAbandonFinishRedirect(
  gameFinished: boolean,
  isNaturallyComplete: boolean,
  handleReturnToLobby: () => void,
  hasLeftForLobbyRef: { current: boolean },
): void {
  useEffect(() => {
    if (!gameFinished || isNaturallyComplete || hasLeftForLobbyRef.current) {
      return;
    }
    handleReturnToLobby();
  }, [
    gameFinished,
    isNaturallyComplete,
    handleReturnToLobby,
    hasLeftForLobbyRef,
  ]);
}
