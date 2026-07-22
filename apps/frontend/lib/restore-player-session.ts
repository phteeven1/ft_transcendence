import { playersApi } from '@/lib/api';
import type { PlayerDto } from '@/lib/api/players/types';
import {
  clearPlayerSession,
  getPlayerSession,
  isSessionExpired,
} from '@/lib/player-session';

type RestoreCallbacks = {
  loginAsPlayer: (player: PlayerDto) => void;
  setSessionExpiresAt: (expiresAt: number) => void;
};

/**
 * Rehydrates the in-memory player from sessionStorage after a full page reload.
 * Game pages keep working via URL params, but the lobby requires auth context.
 */
export async function restorePlayerFromSession(
  callbacks: RestoreCallbacks,
): Promise<PlayerDto | null> {
  const stored = getPlayerSession();
  if (!stored || isSessionExpired(stored.expiresAt)) {
    return null;
  }

  try {
    const [validated, playerData] = await Promise.all([
      playersApi.validateSession({
        playerId: stored.playerId,
        token: stored.token,
      }),
      playersApi.getById(stored.playerId),
    ]);

    callbacks.loginAsPlayer(playerData);
    callbacks.setSessionExpiresAt(new Date(validated.expiresAt).getTime());
    return playerData;
  } catch {
    clearPlayerSession();
    return null;
  }
}
