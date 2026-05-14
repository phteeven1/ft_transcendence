'use client';

// useSessionGuard — call this at the top of any player-facing page.
// Checks on mount and every 30 seconds whether the session has expired.
// If it has, navigates to /session_over.
// The actual redirect to /session_over only happens between games (on select_game
// or play_game mount/navigation), never mid-game, since the hook only fires
// when the component mounts or its interval ticks.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';

export function useSessionGuard() {
  const { sessionExpiresAt } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const check = () => {
      if (sessionExpiresAt !== null && Date.now() > sessionExpiresAt) {
        router.push('/session_over');
      }
    };
    check(); // check immediately on mount
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [sessionExpiresAt, router]);
}
