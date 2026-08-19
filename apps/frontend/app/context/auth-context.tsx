'use client';
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { groupsApi, usersApi, type UserDto } from '@/lib/api';
import type { GroupDto } from '@/lib/api/groups/types';
import { SESSION_UNAUTHORIZED_EVENT } from '@/lib/api/http';
import { clearPlayerSession } from '@/lib/player-session';
import { clearPendingSessionEnd } from '@/lib/pending-session-end';
import { useSessionCloseGuard } from '../hooks/use-session-close-guard';
import {
  clearStoredGroupId,
  clearStoredParentAuth,
  getStoredGroupId,
  getStoredSessionToken,
  getStoredUserId,
  PARENT_SESSION_TOKEN_KEY,
  PARENT_USER_ID_KEY,
  setStoredGroupId,
  setStoredSessionToken,
  setStoredUserId,
} from '@/lib/parent-session';
import { getPlayerSession } from '@/lib/player-session';
import { acquireSocket, releaseSocket } from '@/lib/socket';
import { Player } from '../types';

type User = UserDto;
type Group = GroupDto;

type ParentSession = {
  token: string;
};

type AuthContextType = {
  user: User | null;
  group: Group | null;
  player: Player | null;
  authReady: boolean;
  login: (userData: User, session: ParentSession) => void;
  logout: (options?: { localOnly?: boolean }) => void;
  leaveGroup: () => void;
  syncGroup: (groupId: number) => Promise<Group | null>;
  refreshUser: () => Promise<User | null>;
  loginAsPlayer: (playerData: Player) => void;
  logoutPlayer: () => void;
  sessionExpiresAt: number | null;
  setSessionExpiresAt: (expiresAt: number) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const userRef = useRef<User | null>(null);
  const playerRef = useRef<Player | null>(null);
  const parentTokenRef = useRef<string | null>(null);
  useSessionCloseGuard();
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const setSessionExpiry = useCallback((expiresAt: number) => {
    setSessionExpiresAt((prev) => (prev === expiresAt ? prev : expiresAt));
  }, []);

  const loginAsPlayer = useCallback((playerData: Player) => {
    setPlayer(playerData);
  }, []);

  const logoutPlayer = useCallback(() => {
    clearPlayerSession();
    clearPendingSessionEnd();
    setPlayer(null);
    setSessionExpiresAt(null);
  }, []);

  const login = useCallback((userData: User, session: ParentSession) => {
    parentTokenRef.current = session.token;
    setStoredUserId(userData.id);
    setStoredSessionToken(session.token);
    setUser(userData);
  }, []);

  const leaveGroup = useCallback(() => {
    clearStoredGroupId();
    setGroup(null);
  }, []);

  const dropParentLocally = useCallback(() => {
    parentTokenRef.current = null;
    setUser(null);
    setGroup(null);
  }, []);

  const logout = useCallback(
    (options?: { localOnly?: boolean }) => {
      const token = parentTokenRef.current ?? getStoredSessionToken();
      if (!options?.localOnly && token) {
        void usersApi.clearSession({ token }).catch(() => undefined);
      }
      if (
        !getStoredSessionToken() ||
        getStoredSessionToken() === parentTokenRef.current
      ) {
        clearStoredParentAuth();
      }
      dropParentLocally();
    },
    [dropParentLocally],
  );

  const handleParentReplaced = useCallback(() => {
    const storedToken = getStoredSessionToken();
    if (storedToken && storedToken === parentTokenRef.current) {
      clearStoredParentAuth();
    }
    dropParentLocally();
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      router.replace('/');
    }
  }, [dropParentLocally, router]);

  const handlePlayerReplaced = useCallback(() => {
    logoutPlayer();
    if (
      typeof window !== 'undefined' &&
      window.location.pathname !== '/session_over'
    ) {
      router.replace('/session_over');
    }
  }, [logoutPlayer, router]);

  const syncGroup = useCallback(
    async (groupId: number): Promise<Group | null> => {
      try {
        const updatedGroup = await groupsApi.getById(groupId);
        setStoredGroupId(groupId);
        setGroup(updatedGroup);
        return updatedGroup;
      } catch {
        return null;
      }
    },
    [],
  );

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const current = userRef.current;
    if (!current) return null;
    try {
      const data = await usersApi.getById(current.id);
      setUser(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const storedUserId = getStoredUserId();
      const storedToken = getStoredSessionToken();
      if (!storedUserId || !storedToken) {
        if (storedUserId && !storedToken) clearStoredParentAuth();
        if (!cancelled) setAuthReady(true);
        return;
      }

      try {
        await usersApi.validateSession({
          userId: storedUserId,
          token: storedToken,
        });
        const data = await usersApi.getById(storedUserId);
        if (cancelled) return;
        parentTokenRef.current = storedToken;
        setUser(data);

        const storedGroupId = getStoredGroupId();
        if (storedGroupId) {
          const isMember =
            data.isMemberOf.includes(storedGroupId) ||
            data.isAdminOf.includes(storedGroupId);
          if (isMember) {
            try {
              const restoredGroup = await groupsApi.getById(storedGroupId);
              if (!cancelled) setGroup(restoredGroup);
            } catch {
              clearStoredGroupId();
            }
          } else {
            clearStoredGroupId();
          }
        }
      } catch {
        clearStoredParentAuth();
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent): void => {
      if (
        event.key !== PARENT_USER_ID_KEY &&
        event.key !== PARENT_SESSION_TOKEN_KEY
      ) {
        return;
      }
      if (playerRef.current || getPlayerSession()) return;

      if (event.key === PARENT_SESSION_TOKEN_KEY) {
        if (
          event.newValue &&
          parentTokenRef.current &&
          event.newValue !== parentTokenRef.current
        ) {
          dropParentLocally();
        }
        return;
      }

      if (event.newValue === null) {
        dropParentLocally();
        return;
      }

      const nextUserId = Number(event.newValue);
      if (!Number.isFinite(nextUserId) || nextUserId <= 0) return;

      void (async () => {
        try {
          const nextToken = getStoredSessionToken();
          if (!nextToken) {
            dropParentLocally();
            return;
          }
          if (
            parentTokenRef.current &&
            nextToken !== parentTokenRef.current
          ) {
            dropParentLocally();
            return;
          }
          await usersApi.validateSession({
            userId: nextUserId,
            token: nextToken,
          });
          const data = await usersApi.getById(nextUserId);
          setUser(data);
          const storedGroupId = getStoredGroupId();
          if (!storedGroupId) {
            setGroup(null);
            return;
          }
          const isMember =
            data.isMemberOf.includes(storedGroupId) ||
            data.isAdminOf.includes(storedGroupId);
          if (!isMember) {
            clearStoredGroupId();
            setGroup(null);
            return;
          }
          try {
            setGroup(await groupsApi.getById(storedGroupId));
          } catch {
            clearStoredGroupId();
            setGroup(null);
          }
        } catch {
          dropParentLocally();
        }
      })();
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [dropParentLocally]);

  useEffect(() => {
    const onUnauthorized = (event: Event): void => {
      const kind = (event as CustomEvent<{ kind?: string }>).detail?.kind;
      if (kind === 'player' || getPlayerSession()) {
        handlePlayerReplaced();
        return;
      }
      handleParentReplaced();
    };
    window.addEventListener(SESSION_UNAUTHORIZED_EVENT, onUnauthorized);
    return () =>
      window.removeEventListener(SESSION_UNAUTHORIZED_EVENT, onUnauthorized);
  }, [handleParentReplaced, handlePlayerReplaced]);

  useEffect(() => {
    const parentToken = parentTokenRef.current;
    const storedPlayer = getPlayerSession();
    if (!user && !storedPlayer) return;

    let active = true;
    const key = storedPlayer
      ? `session:player:${storedPlayer.playerId}`
      : `session:user:${user?.id ?? 0}`;
    const socket = acquireSocket(key);

    const join = (): void => {
      if (!active) return;
      if (storedPlayer) {
        socket.emit('joinSession', {
          kind: 'player',
          id: storedPlayer.playerId,
          token: storedPlayer.token,
        });
        return;
      }
      if (user && parentToken) {
        socket.emit('joinSession', {
          kind: 'user',
          id: user.id,
          token: parentToken,
        });
      }
    };

    const onReplaced = (): void => {
      if (!active) return;
      if (storedPlayer) {
        handlePlayerReplaced();
        return;
      }
      handleParentReplaced();
    };

    socket.on('connect', join);
    socket.on('session:replaced', onReplaced);
    if (socket.connected) join();

    return () => {
      active = false;
      socket.off('connect', join);
      socket.off('session:replaced', onReplaced);
      releaseSocket(key);
    };
  }, [user, player, handleParentReplaced, handlePlayerReplaced]);

  return (
    <AuthContext.Provider
      value={{
        user,
        group,
        player,
        authReady,
        login,
        logout,
        leaveGroup,
        syncGroup,
        refreshUser,
        loginAsPlayer,
        logoutPlayer,
        sessionExpiresAt,
        setSessionExpiresAt: setSessionExpiry,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
