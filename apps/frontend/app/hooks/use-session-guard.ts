'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';
import { getPlayerSession } from '@/lib/player-session';
import { playersApi } from '@/lib/api';

export function useSessionGuard() {
  const { sessionExpiresAt, logoutPlayer } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const stored = getPlayerSession();
      const expiresAtMs =
        sessionExpiresAt ??
        (stored ? new Date(stored.expiresAt).getTime() : null);

      if (expiresAtMs !== null && Date.now() > expiresAtMs) {
        router.push('/session_over');
        return;
      }

      if (!stored) return;
      try {
        await playersApi.validateSession({
          playerId: stored.playerId,
          token: stored.token,
        });
      } catch {
        logoutPlayer();
        router.push('/session_over');
      }
    };

    void check();
    const interval = setInterval(() => {
      void check();
    }, 30000);
    return () => clearInterval(interval);
  }, [sessionExpiresAt, router, logoutPlayer]);
}
