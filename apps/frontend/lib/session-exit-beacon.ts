import { getApiBaseUrl } from './api/config';

/**
 * Fire-and-forget API calls that must survive tab close.
 * Uses fetch({ keepalive: true }) — more reliable than sendBeacon + JSON across origins.
 */
function postOnUnload(path: string, body: object): void {
  if (typeof window === 'undefined') return;

  const url = `${getApiBaseUrl()}${path}`;
  const payload = JSON.stringify(body);

  try {
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
  } catch {
    const blob = new Blob([payload], { type: 'application/json' });
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
