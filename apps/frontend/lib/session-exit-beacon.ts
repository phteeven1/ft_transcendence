import { getApiBaseUrl } from './api/config';

const URLENCODED = 'application/x-www-form-urlencoded';

function toUrlEncoded(body: Record<string, string | number>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    params.set(key, String(value));
  }
  return params.toString();
}

/**
 * Fire-and-forget API calls that must survive tab close.
 * Urlencoded + keepalive avoids a CORS preflight (JSON Content-Type cannot).
 */
function postOnUnload(
  path: string,
  body: Record<string, string | number>,
): void {
  if (typeof window === 'undefined') return;

  const url = `${getApiBaseUrl()}${path}`;
  const payload = toUrlEncoded(body);

  try {
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': URLENCODED },
      body: payload,
      keepalive: true,
    });
  } catch {
    const blob = new Blob([payload], { type: URLENCODED });
    navigator.sendBeacon?.(url, blob);
  }
}

/** Frees the player for new Play Now sessions (token + currentGameId). */
export function sendClearSessionOnUnload(playerId: number): void {
  postOnUnload('/players/clearSession', { playerId });
}

/** Leaves the active game and frees the player session. */
export function sendAbandonPlayOnUnload(gameId: number, playerId: number): void {
  postOnUnload('/games/abandonPlay', { gameId, playerId });
}
