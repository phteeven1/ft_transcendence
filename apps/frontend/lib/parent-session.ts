export const PARENT_USER_ID_KEY = 'dicteeUserId';
export const PARENT_SESSION_TOKEN_KEY = 'dicteeParentSession';
const USER_ID_KEY = PARENT_USER_ID_KEY;
const GROUP_ID_KEY = 'dicteeGroupId';

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

export function getStoredParentSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(PARENT_SESSION_TOKEN_KEY);
  return token && token.length > 0 ? token : null;
}

export function setStoredParentSessionToken(sessionToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PARENT_SESSION_TOKEN_KEY, sessionToken);
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
  localStorage.removeItem(PARENT_SESSION_TOKEN_KEY);
}

export function clearStoredGroupId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GROUP_ID_KEY);
}
