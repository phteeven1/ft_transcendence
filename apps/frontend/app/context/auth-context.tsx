'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { groupsApi, usersApi, type UserDto } from '@/lib/api';
import type { GroupDto } from '@/lib/api/groups/types';
import { clearPlayerSession } from '@/lib/player-session';
import { Player } from '../types';

type User = UserDto;
type Group = GroupDto;

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
  setSessionExpiresAt: (expiresAt: number) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  const setSessionExpiry = (expiresAt: number) => {
    setSessionExpiresAt(expiresAt);
  };

  const loginAsPlayer = (playerData: Player) => {
    setUser(null);
    setGroup(null);
    setPlayer(playerData);
  };

  const logoutPlayer = () => {
    clearPlayerSession();
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
      const updatedGroup = await groupsApi.getById(groupId);
      setGroup(updatedGroup);
      setUser((prev) => (prev ? { ...prev, currentGroup: groupId } : prev));
      return updatedGroup;
    } catch (error) {
      console.error('syncGroup failed:', error);
      return null;
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    if (!user) return null;
    try {
      const data = await usersApi.getById(user.id);
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
