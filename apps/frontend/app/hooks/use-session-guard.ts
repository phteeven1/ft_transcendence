'use client';

// useSessionGuard — call this at the top of any player-facing page.
// Checks on mount, when the tab becomes visible, and every 30 seconds whether
// the session has expired or been replaced. If it has, navigates to /session_over.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { ApiError, playersApi } from '@/lib/api';
import { getPlayerSession } from '@/lib/player-session';

export function useSessionGuard() {
  const { sessionExpiresAt, logoutPlayer } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const endSession = (): void => {
      logoutPlayer();
      router.replace('/session_over');
    };

    const check = (): void => {
      const stored = getPlayerSession();
      const expiresAtMs = sessionExpiresAt ?? (
        stored ? new Date(stored.expiresAt).getTime() : null
      );

      if (expiresAtMs !== null && Date.now() > expiresAtMs) {
        endSession();
      }
    };

    const validateRemote = async (): Promise<void> => {
      const stored = getPlayerSession();
      if (!stored) return;
      try {
        await playersApi.validateSession({
          playerId: stored.playerId,
          token: stored.token,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          endSession();
        }
      }
    };

    const onVisible = (): void => {
      if (document.visibilityState !== 'visible') return;
      check();
      void validateRemote();
    };

    check();
    void validateRemote();
    const interval = setInterval(() => {
      check();
      void validateRemote();
    }, 30000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sessionExpiresAt, router, logoutPlayer]);
}
