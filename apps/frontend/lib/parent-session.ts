export const PARENT_USER_ID_KEY = 'dicteeUserId';
export const PARENT_SESSION_TOKEN_KEY = 'dicteeUserSessionToken';
const USER_ID_KEY = PARENT_USER_ID_KEY;
const GROUP_ID_KEY = 'dicteeGroupId';
const TOKEN_KEY = PARENT_SESSION_TOKEN_KEY;

export function getStoredUserId(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_ID_KEY);
  if (!raw) return null;
  const userId = Number(raw);
  return Number.isFinite(userId) && userId > 0 ? userId : null;
}

export function setStoredUserId(userId: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_ID_KEY, String(userId));
}

export function getStoredSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredGroupId(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(GROUP_ID_KEY);
  if (!raw) return null;
  const groupId = Number(raw);
  return Number.isFinite(groupId) && groupId > 0 ? groupId : null;
}

export function setStoredGroupId(groupId: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GROUP_ID_KEY, String(groupId));
}

export function clearStoredParentAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(GROUP_ID_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function clearStoredGroupId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GROUP_ID_KEY);
}
