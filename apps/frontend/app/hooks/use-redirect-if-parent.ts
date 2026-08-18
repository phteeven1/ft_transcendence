'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/auth-context';

/** True while auth is hydrating or a logged-in parent is being sent to the dashboard. */
export function useRedirectIfParent(): boolean {
  const { user, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authReady || !user) return;
    router.replace('/dashboard');
  }, [authReady, user, router]);

  return !authReady || Boolean(user);
}
