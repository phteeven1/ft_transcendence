'use client';

import { useCallback, useEffect, useRef } from 'react';
import { sendClearSessionOnUnload } from '@/lib/session-exit-beacon';

type Options = {
  enabled: boolean;
  playerId: number;
};

/**
 * On tab close, clears the Play Now session so the parent can start a new one.
 * In-app Leave session should call markIntentionalExit so this does not double-fire.
 */
export function usePlayerSessionExitGuard({ enabled, playerId }: Options) {
  const intentionalExitRef = useRef(false);

  const markIntentionalExit = useCallback(() => {
    intentionalExitRef.current = true;
  }, []);

  useEffect(() => {
    if (!enabled || !playerId) return;

    const handlePageHide = (event: PageTransitionEvent) => {
      if (intentionalExitRef.current) return;
      if (event.persisted) return;
      sendClearSessionOnUnload(playerId);
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [enabled, playerId]);

  return { markIntentionalExit };
}
