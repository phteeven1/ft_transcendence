import { getApiBaseUrl } from './config';
import { ApiError } from './errors';
import { getPlayerSession } from '../player-session';
import {
  getStoredSessionToken,
  getStoredUserId,
} from '../parent-session';

export const SESSION_UNAUTHORIZED_EVENT = 'dictee:unauthorized';

const SKIP_SESSION_HEADER_PATHS = new Set([
  '/users/signin',
  '/users/register',
  '/users/validateSession',
  '/players/validateSession',
]);

const SKIP_UNAUTHORIZED_EVENT_PATHS = new Set([
  ...SKIP_SESSION_HEADER_PATHS,
  '/users/clearSession',
  '/players/clearSession',
]);

export function applySessionHeaders(headers: Headers, path?: string): void {
  if (path && SKIP_SESSION_HEADER_PATHS.has(path)) return;

  const player = getPlayerSession();
  if (player) {
    headers.set('X-Player-Id', String(player.playerId));
    headers.set('X-Player-Session-Token', player.token);
    return;
  }

  const userId = getStoredUserId();
  const token = getStoredSessionToken();
  if (userId && token) {
    headers.set('X-User-Id', String(userId));
    headers.set('X-User-Session-Token', token);
  }
}

export function notifySessionUnauthorized(
  kind: 'player' | 'parent',
): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(SESSION_UNAUTHORIZED_EVENT, { detail: { kind } }),
  );
}

export function notifyUnauthorized(path: string): void {
  if (typeof window === 'undefined') return;
  if (SKIP_UNAUTHORIZED_EVENT_PATHS.has(path)) return;
  const kind = getPlayerSession() ? 'player' : 'parent';
  notifySessionUnauthorized(kind);
}

/**
 * Low-level HTTP helper. UI and pages should not call this directly —
 * use domain modules such as `usersApi` instead.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${getApiBaseUrl()}${normalizedPath}`;

  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  applySessionHeaders(headers, normalizedPath);

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new ApiError(
      0,
      `Cannot reach the API at ${url}. Is the backend running?`,
    );
  }

  const text = await res.text();

  if (!res.ok) {
    if (res.status === 401) {
      notifyUnauthorized(normalizedPath);
    }
    let message: string | undefined;
    if (text) {
      try {
        const body = JSON.parse(text) as { message?: string | string[] };
        if (typeof body.message === 'string') {
          message = body.message;
        } else if (Array.isArray(body.message)) {
          message = body.message.join(', ');
        }
      } catch {
        message = text;
      }
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
