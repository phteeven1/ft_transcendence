'use client';

// useSessionGuard — call this at the top of any player-facing page.
// Checks on mount and every 30 seconds whether the session has expired.
// If it has, navigates to /session_over.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import {
  getPlayerSession,
  //isSessionExpired,
} from '@/lib/player-session';

export function useSessionGuard() {
  const { sessionExpiresAt } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const check = () => {
      const stored = getPlayerSession();
      const expiresAtMs = sessionExpiresAt ?? (
        stored ? new Date(stored.expiresAt).getTime() : null
      );

      if (expiresAtMs !== null && Date.now() > expiresAtMs) {
        router.push('/session_over');
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [sessionExpiresAt, router]);
}
