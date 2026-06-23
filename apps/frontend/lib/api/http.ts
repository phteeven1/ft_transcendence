import { getApiBaseUrl } from './config';
import { ApiError } from './errors';

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

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new ApiError(
      0,
      `Cannot reach the API at ${url}. Is the backend running on port 4000?`,
    );
  }

  if (!res.ok) {
    throw new ApiError(res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
