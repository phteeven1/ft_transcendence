'use client';

import { useCallback, useEffect, useRef } from 'react';
import { sendAbandonPlayOnUnload } from '@/lib/session-exit-beacon';

type Options = {
  enabled: boolean;
  gameId: number;
  playerId: number;
};

/**
 * On tab close, leaves the game and clears the Play Now session.
 * In-app Leave or Return to Lobby should call markIntentionalExit so this
 * does not fire during client navigation.
 */
export function useGameExitGuard({ enabled, gameId, playerId }: Options) {
  const intentionalExitRef = useRef(false);

  const markIntentionalExit = useCallback(() => {
    intentionalExitRef.current = true;
  }, []);

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
