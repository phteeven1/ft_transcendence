import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { MutableRefObject } from 'react';

import type { PlayerDto } from '@/lib/api/players/types';
import {
  getPlayerSession,
  isSessionExpired,
} from '@/lib/player-session';
import { restorePlayerFromSession } from '@/lib/restore-player-session';

/**
 * Whether the local player is the last active participant — used only for
 * abandon-modal copy ("you'll end the game" vs "others keep playing").
 */
export function computeIsLastRemaining(
  participantIds: number[],
  localPlayerId: number,
  leftPlayers: Record<number, string>,
): boolean {
  if (participantIds.length === 0) return false;
  const remaining = participantIds.filter(
    (id) => id === localPlayerId || !leftPlayers[id],
  );
  return remaining.length <= 1;
}

export interface IReturnToLobbyDeps {
  router: AppRouterInstance;
  loginAsPlayer: (player: PlayerDto) => void;
  setSessionExpiresAt: (expiresAt: number) => void;
  /** `replace` for mount/init redirects; `push` for in-game leave (default). */
  method?: 'push' | 'replace';
}

/**
 * Navigates to the lobby or session-over page once per match session.
 * Shared by Word Building, Word Soup, and init-time redirects.
 */
export function returnToLobbyOnce(
  hasLeftForLobbyRef: MutableRefObject<boolean>,
  deps: IReturnToLobbyDeps,
): void {
  if (hasLeftForLobbyRef.current) return;
  hasLeftForLobbyRef.current = true;

  const navigate =
    deps.method === 'replace' ? deps.router.replace : deps.router.push;
  const stored = getPlayerSession();

  if (stored && !isSessionExpired(stored.expiresAt)) {
    void restorePlayerFromSession({
      loginAsPlayer: deps.loginAsPlayer,
      setSessionExpiresAt: deps.setSessionExpiresAt,
    }).then(() => {
      navigate('/select_game');
    });
    return;
  }

  navigate('/session_over');
}
