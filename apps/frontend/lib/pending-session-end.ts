export const SESSION_CLOSE_GRACE_MS = 2000;
export const PENDING_SESSION_END_KEY = 'dicteePendingSessionEnd';

export type PendingSessionEnd = {
  playerId: number;
  at: number;
};

export function readPendingSessionEnd(): PendingSessionEnd | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(PENDING_SESSION_END_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingSessionEnd;
    if (
      !Number.isInteger(parsed.playerId) ||
      parsed.playerId <= 0 ||
      !Number.isFinite(parsed.at)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingSessionEnd(playerId: number): void {
  if (typeof window === 'undefined') return;
  const pending: PendingSessionEnd = { playerId, at: Date.now() };
  localStorage.setItem(PENDING_SESSION_END_KEY, JSON.stringify(pending));
}

export function clearPendingSessionEnd(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PENDING_SESSION_END_KEY);
}
