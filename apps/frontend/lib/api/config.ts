/**
 * Backend URL from the browser's current host.
 * Docker/HTTPS: https://<this-machine>/api (Nginx).
 * Local `next dev`: http://<this-machine>:3000/api (rewritten to :4000).
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  return '/api';
}

/** Socket.IO origin. Local Next (:3000) talks to Nest (:4000); Docker uses Nginx. */
export function getSocketUrl(): string {
  if (typeof window !== 'undefined') {
    if (window.location.port === '3000') {
      return `${window.location.protocol}//${window.location.hostname}:4000`;
    }
    return window.location.origin;
  }
  return 'http://localhost:4000';
}
