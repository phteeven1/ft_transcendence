const STORAGE_KEY = 'dictee:pendingAvatarUnlock';

type PendingAvatarUnlock = {
  playerId: number;
  tier: number;
};

function readPending(): PendingAvatarUnlock | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAvatarUnlock;
    if (
      typeof parsed?.playerId !== 'number' ||
      typeof parsed?.tier !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Stores a one-shot unlock celebration for the local player. */
export function stashPendingAvatarUnlock(
  playerId: number,
  tier: number,
): void {
  if (typeof window === 'undefined') return;
  if (!Number.isFinite(tier) || tier <= 0) return;
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ playerId, tier } satisfies PendingAvatarUnlock),
  );
}

/** Reads a pending unlock for this player without clearing it. */
export function peekPendingAvatarUnlock(playerId: number): number | null {
  const pending = readPending();
  if (!pending || pending.playerId !== playerId) return null;
  return pending.tier;
}

/** Returns and clears a pending unlock for this player (one-shot). */
export function consumePendingAvatarUnlock(playerId: number): number | null {
  const pending = readPending();
  if (!pending || pending.playerId !== playerId) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  return pending.tier;
}

/** Clears a pending unlock after it was shown in-game. */
export function clearPendingAvatarUnlock(playerId: number): void {
  const pending = readPending();
  if (!pending || pending.playerId !== playerId) return;
  sessionStorage.removeItem(STORAGE_KEY);
}
