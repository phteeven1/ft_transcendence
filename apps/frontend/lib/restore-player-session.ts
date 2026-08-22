import { SESSION_RESTORE_TIMEOUT_MS } from '@/app/hooks/game/game-leave.helpers';
import { playersApi } from '@/lib/api';
import type { PlayerDto } from '@/lib/api/players/types';
import {
  clearPlayerSession,
  getPlayerSession,
  isSessionExpired,
} from '@/lib/player-session';

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('Session restore timed out')), ms);
    }),
  ]);
}

export interface IRestorePlayerSessionCallbacks {
  loginAsPlayer: (player: PlayerDto) => void;
  setSessionExpiresAt: (expiresAt: number) => void;
}

/**
 * Rehydrates the in-memory player from sessionStorage after a full page reload.
 * Game pages keep working via URL params, but the lobby requires auth context.
 */
export async function restorePlayerFromSession(
  callbacks: IRestorePlayerSessionCallbacks,
): Promise<PlayerDto | null> {
  const stored = getPlayerSession();
  if (!stored || isSessionExpired(stored.expiresAt)) {
    return null;
  }

  try {
    const [validated, playerData] = await withTimeout(
      Promise.all([
        playersApi.validateSession({
          playerId: stored.playerId,
          token: stored.token,
        }),
        playersApi.getById(stored.playerId),
      ]),
      SESSION_RESTORE_TIMEOUT_MS,
    );

    const storedAfter = getPlayerSession();
    if (!storedAfter || storedAfter.token !== stored.token) {
      return null;
    }

    callbacks.loginAsPlayer(playerData);
    callbacks.setSessionExpiresAt(new Date(validated.expiresAt).getTime());
    return playerData;
  } catch {
    clearPlayerSession();
    return null;
  }
}
