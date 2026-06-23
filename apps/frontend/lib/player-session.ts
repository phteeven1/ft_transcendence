const TOKEN_KEY = 'playerSessionToken';
const EXPIRES_KEY = 'playerSessionExpiresAt';
const PLAYER_ID_KEY = 'playerSessionPlayerId';

export type StoredPlayerSession = {
  playerId: number;
  token: string;
  expiresAt: string;
};

export function savePlayerSession(
  playerId: number,
  token: string,
  expiresAt: string,
): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PLAYER_ID_KEY, String(playerId));
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(EXPIRES_KEY, expiresAt);
}

export function getPlayerSession(): StoredPlayerSession | null {
  if (typeof window === 'undefined') return null;

  const playerIdRaw = sessionStorage.getItem(PLAYER_ID_KEY);
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expiresAt = sessionStorage.getItem(EXPIRES_KEY);

  if (!playerIdRaw || !token || !expiresAt) return null;

  return {
    playerId: Number(playerIdRaw),
    token,
    expiresAt,
  };
}

export function clearPlayerSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PLAYER_ID_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(EXPIRES_KEY);
}

export function isSessionExpired(expiresAt: string): boolean {
  return Date.now() >= new Date(expiresAt).getTime();
}
