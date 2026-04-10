'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type User = {
    userId: number;
    userName: string;
    userEmail: string;
    userGroups: number[]; // array of groupId's the user is a member of
    currentGroup?: number; // id of the currently selected group
};

type Member = {
    memberId: number;
    memberAdmin: boolean;
};

type Group = {
    groupId: number;
    groupName: string;
    groupMembers: Member[];
};

type AuthContextType = {
    user: User | null;
    login: (userData: User) => void;
    logout: () => void;
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

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}