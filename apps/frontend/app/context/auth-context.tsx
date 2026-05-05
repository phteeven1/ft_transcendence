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
  refreshUser: () => Promise<void>;
  loginAsPlayer: (playerData: Player) => void;
  logoutPlayer: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);

  const loginAsPlayer = (playerData: Player) => {
    setUser(null);
    setGroup(null);
    setPlayer(playerData);
  };

  const logoutPlayer = () => {
    setPlayer(null);
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

  const refreshUser = async () => {
    if (!user) return;
    try {
      const res = await fetch(`http://localhost:4000/users/${user.userId}`);
      if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
      const data: User = await res.json();
      setUser(data);
    } catch (error) {
      console.error('refreshUser failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, group, player,
      login, logout, leaveGroup, syncGroup, refreshUser,
      loginAsPlayer, logoutPlayer,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}