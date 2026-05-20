'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { User, Group, Player } from '../types';

type AuthContextType = {
  user: User | null;
  group: Group | null;
  player: Player | null;
  login: (userData: User) => void;
  logout: () => void;
  leaveGroup: () => void;
  syncGroup: (groupId: number) => Promise<Group | null>;
  refreshUser: () => Promise<User | null>;
  loginAsPlayer: (playerData: Player) => void;
  logoutPlayer: () => void;
  sessionExpiresAt: number | null;
  setSessionTimer: (minutes: number) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  const setSessionTimer = (minutes: number) => {
    setSessionExpiresAt(Date.now() + minutes * 60 * 1000);
  };

  const loginAsPlayer = (playerData: Player) => {
    setUser(null);
    setGroup(null);
    setPlayer(playerData);
  };

  const logoutPlayer = () => {
    setPlayer(null);
    setSessionExpiresAt(null);
  };

  const login = (userData: User) => {
    setUser(userData);
  };

  const leaveGroup = () => {
    setGroup(null);
    if (user) setUser({ ...user, currentGroup: undefined });
  };

  const logout = () => {
    setUser(null);
    setGroup(null);
  };

  const syncGroup = async (groupId: number): Promise<Group | null> => {
    try {
      const res = await fetch(`http://localhost:4000/groups/${groupId}`);
      if (!res.ok) throw new Error(`Failed to fetch group: ${res.status}`);
      const updatedGroup: Group = await res.json();
      setGroup(updatedGroup);
      if (user) setUser({ ...user, currentGroup: groupId });
      return updatedGroup;
    } catch (error) {
      console.error('syncGroup failed:', error);
      return null;
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    if (!user) return null;
    try {
      const res = await fetch(`http://localhost:4000/users/${user.id}`);
      if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
      const data: User = await res.json();
      setUser(data);
      return data;
    } catch (error) {
      console.error('refreshUser failed:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        group,
        player,
        login,
        logout,
        leaveGroup,
        syncGroup,
        refreshUser,
        loginAsPlayer,
        logoutPlayer,
        sessionExpiresAt,
        setSessionTimer,
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
