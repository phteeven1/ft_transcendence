'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

type AuthContextType = {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
    setCurrentGroup: (groupId: number) => void;
    refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    const login = (userData: User) => {
        setUser(userData);
    };

    const logout = () => {
        setUser(null);
    };

    const setCurrentGroup = (groupId: number) => {
        if (user) setUser({ ...user, currentGroup: groupId });
    };

    const refreshUser = async () => {
        if (user) {
            const res = await fetch(`http://localhost:4000/users/${user.userId}`);
            const data = await res.json();
            setUser(data);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, setCurrentGroup, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}