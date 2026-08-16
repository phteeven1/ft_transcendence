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
import { groupsApi, usersApi, type UserDto } from '@/lib/api';
import type { GroupDto } from '@/lib/api/groups/types';
import { clearPlayerSession } from '@/lib/player-session';
import {
  clearStoredGroupId,
  clearStoredParentAuth,
  getStoredGroupId,
  getStoredUserId,
  setStoredGroupId,
  setStoredUserId,
} from '@/lib/parent-session';
import { Player } from '../types';

type User = UserDto;
type Group = GroupDto;

type AuthContextType = {
  user: User | null;
  group: Group | null;
  player: Player | null;
  authReady: boolean;
  login: (userData: User) => void;
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
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const userRef = useRef<User | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const setSessionExpiry = useCallback((expiresAt: number) => {
    setSessionExpiresAt((prev) => (prev === expiresAt ? prev : expiresAt));
  }, []);

  const loginAsPlayer = useCallback((playerData: Player) => {
    setUser(null);
    setGroup(null);
    setPlayer(playerData);
  }, []);

  const logoutPlayer = useCallback(() => {
    clearPlayerSession();
    setPlayer(null);
    setSessionExpiresAt(null);
  }, []);

  const login = useCallback((userData: User) => {
    setStoredUserId(userData.id);
    setUser(userData);
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
      if (!storedUserId) {
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
