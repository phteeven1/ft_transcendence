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
import type { AuthResult } from '@/lib/api/users/types';
import type { GroupDto } from '@/lib/api/groups/types';
import { clearPlayerSession } from '@/lib/player-session';
import { clearPendingSessionEnd } from '@/lib/pending-session-end';
import { useSessionCloseGuard } from '../hooks/use-session-close-guard';
import { acquireSocket, releaseSocket } from '@/lib/socket';
import {
  clearStoredGroupId,
  clearStoredParentAuth,
  getStoredGroupId,
  getStoredParentSessionToken,
  getStoredUserId,
  PARENT_SESSION_TOKEN_KEY,
  PARENT_USER_ID_KEY,
  setStoredGroupId,
  setStoredParentSessionToken,
  setStoredUserId,
} from '@/lib/parent-session';
import { getPlayerSession } from '@/lib/player-session';
import { Player } from '../types';

type User = UserDto;
type Group = GroupDto;

type AuthContextType = {
  user: User | null;
  group: Group | null;
  player: Player | null;
  authReady: boolean;
  login: (userData: AuthResult) => void;
  logout: () => void;
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

  const login = useCallback((userData: AuthResult) => {
    const { sessionToken, ...profile } = userData;
    setStoredUserId(profile.id);
    setStoredParentSessionToken(sessionToken);
    setUser(profile);
  }, []);

  const leaveGroup = useCallback(() => {
    clearStoredGroupId();
    setGroup(null);
  }, []);

  const logout = useCallback(() => {
    clearStoredParentAuth();
    setUser(null);
    setGroup(null);
  }, []);

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
      const storedToken = getStoredParentSessionToken();
      if (!storedUserId || !storedToken) {
        if (storedUserId || storedToken) clearStoredParentAuth();
        if (!cancelled) setAuthReady(true);
        return;
      }

      try {
        const data = await usersApi.getById(storedUserId);
        if (cancelled) return;
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

      if (event.newValue === null) {
        setUser(null);
        setGroup(null);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!user || player || getPlayerSession()) return;

    let active = true;
    const key = `parent-session:${user.id}`;
    const socket = acquireSocket(key);
    const groupId = group?.id ?? 0;

    const join = (): void => {
      if (!active) return;
      socket.emit('joinDashboard', { groupId, userId: user.id });
    };

    const onParentSessionReplaced = (payload: {
      sessionToken: string;
    }): void => {
      if (!active) return;
      const stored = getStoredParentSessionToken();
      if (!stored || stored === payload.sessionToken) return;
      logout();
      router.replace('/');
    };

    socket.on('connect', join);
    socket.on('parent:sessionReplaced', onParentSessionReplaced);
    if (socket.connected) join();

    return () => {
      active = false;
      socket.off('connect', join);
      socket.off('parent:sessionReplaced', onParentSessionReplaced);
      releaseSocket(key);
    };
  }, [user, player, group?.id, logout, router]);

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
