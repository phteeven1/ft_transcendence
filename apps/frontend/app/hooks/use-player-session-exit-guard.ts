'use client';

import { useEffect, useRef } from 'react';
import { sendClearSessionOnUnload } from '@/lib/session-exit-beacon';
import { useBeforeUnloadWarning } from './use-before-unload-warning';

type Options = {
  enabled: boolean;
  playerId: number;
  onIntentionalExit?: () => void;
};

/**
 * On select_game: warns before tab close. If the user confirms "Leave site",
 * clears the server session so the parent can start Play Now again.
 */
export function usePlayerSessionExitGuard({
  enabled,
  playerId,
  onIntentionalExit,
}: Options) {
  const intentionalExitRef = useRef(false);

  useBeforeUnloadWarning(enabled);

  const markIntentionalExit = () => {
    intentionalExitRef.current = true;
    onIntentionalExit?.();
  };

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
