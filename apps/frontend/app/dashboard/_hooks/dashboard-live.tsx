'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useDashboardSocket } from '../../hooks/use-dashboard-socket';

const DashboardLiveContext = createContext<
  ((callback: () => void) => () => void) | undefined
>(undefined);

type ProviderProps = {
  userId: number;
  groupId: number;
  enabled: boolean;
  children: ReactNode;
};

export function DashboardLiveProvider({
  userId,
  groupId,
  enabled,
  children,
}: ProviderProps): ReactNode {
  const listenersRef = useRef(new Set<() => void>());

  const register = useCallback((callback: () => void): (() => void) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  const fire = useCallback((): void => {
    listenersRef.current.forEach((callback) => callback());
  }, []);

  useDashboardSocket({
    userId,
    groupId,
    enabled,
    onDashboardUpdate: fire,
    onMembershipChanged: fire,
  });

  useEffect(() => {
    if (!enabled) return;
    const onVisible = (): void => {
      if (document.visibilityState !== 'visible') return;
      fire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [enabled, fire]);

  return (
    <DashboardLiveContext.Provider value={register}>
      {children}
    </DashboardLiveContext.Provider>
  );
}

export function useDashboardLive(onUpdate: () => void): void {
  const register = useContext(DashboardLiveContext);
  if (!register) {
    throw new Error(
      'useDashboardLive must be used within a DashboardLiveProvider',
    );
  }
  useEffect(() => register(onUpdate), [register, onUpdate]);
}
