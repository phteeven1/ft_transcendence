'use client';

import { useEffect, useRef } from 'react';
import { sendAbandonPlayOnUnload } from '@/lib/session-exit-beacon';
import { useBeforeUnloadWarning } from './use-before-unload-warning';

type Options = {
  enabled: boolean;
  gameId: number;
  playerId: number;
  onIntentionalExit: () => void;
};

/**
 * Warns before tab close. If the user confirms "Leave site",
 * leaves the game and clears the session on the server.
 */
export function useGameExitGuard({
  enabled,
  gameId,
  playerId,
  onIntentionalExit,
}: Options) {
  const intentionalExitRef = useRef(false);

  useBeforeUnloadWarning(enabled);

  const markIntentionalExit = () => {
    intentionalExitRef.current = true;
    onIntentionalExit();
  };

  useEffect(() => {
    if (!enabled || !gameId || !playerId) return;

    const handlePageHide = (event: PageTransitionEvent) => {
      if (intentionalExitRef.current) return;
      if (event.persisted) return;
      sendAbandonPlayOnUnload(gameId, playerId);
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [enabled, gameId, playerId]);

  return { markIntentionalExit };
}
