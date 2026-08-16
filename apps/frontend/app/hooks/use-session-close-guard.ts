'use client';

import { useEffect } from 'react';
import { playersApi } from '@/lib/api';
import { getPlayerSession } from '@/lib/player-session';
import {
  clearPendingSessionEnd,
  PENDING_SESSION_END_KEY,
  readPendingSessionEnd,
  SESSION_CLOSE_GRACE_MS,
  writePendingSessionEnd,
} from '@/lib/pending-session-end';

export function useSessionCloseGuard(): void {
  useEffect(() => {
    let timeoutId: number | undefined;

    const cancelTimer = (): void => {
      if (timeoutId === undefined) return;
      window.clearTimeout(timeoutId);
      timeoutId = undefined;
    };

    const consumePending = (): void => {
      cancelTimer();
      const pending = readPendingSessionEnd();
      if (!pending) return;

      const stored = getPlayerSession();
      if (stored) {
        if (stored.playerId === pending.playerId) {
          clearPendingSessionEnd();
        }
        return;
      }

      const waitMs = pending.at + SESSION_CLOSE_GRACE_MS - Date.now();
      const finish = async (): Promise<void> => {
        const stillPending = readPendingSessionEnd();
        if (!stillPending || stillPending.playerId !== pending.playerId) return;
        if (getPlayerSession()) {
          clearPendingSessionEnd();
          return;
        }
        try {
          await playersApi.clearSession(pending.playerId);
        } catch {
          /* parent can still End session */
        }
        if (readPendingSessionEnd()?.playerId === pending.playerId) {
          clearPendingSessionEnd();
        }
      };

      if (waitMs <= 0) {
        void finish();
        return;
      }
      timeoutId = window.setTimeout(() => {
        void finish();
      }, waitMs);
    };

    const onPageHide = (event: PageTransitionEvent): void => {
      if (event.persisted) return;
      const stored = getPlayerSession();
      if (!stored) return;
      writePendingSessionEnd(stored.playerId);
    };

    const onPageShow = (): void => {
      if (!getPlayerSession()) return;
      clearPendingSessionEnd();
      cancelTimer();
    };

    const onStorage = (event: StorageEvent): void => {
      if (event.key !== PENDING_SESSION_END_KEY && event.key !== null) return;
      consumePending();
    };

    consumePending();
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('storage', onStorage);

    return () => {
      cancelTimer();
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
}
