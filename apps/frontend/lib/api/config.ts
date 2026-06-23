/** Single place for the backend base URL (set NEXT_PUBLIC_API_URL in .env.local). */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
}
