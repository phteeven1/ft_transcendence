'use client';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { groupsApi } from '@/lib/api';
import { Group } from '../types';
import UserSettings from './_components/user-settings';
import { PageShell } from '../components/ui/page-shell';
import { Button } from '../components/ui/button';

export default function Dashboard() {
  const { user, syncGroup, refreshUser } = useAuth();
  const router = useRouter();
  const [adminGroups, setAdminGroups] = useState<Group[]>([]);
  const [memberGroups, setMemberGroups] = useState<Group[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    try {
      const freshUser = await refreshUser();
      if (!freshUser) return;
      const adminResults = await Promise.all(
        freshUser.isAdminOf.map((id) => groupsApi.getById(id)),
      );
      const memberResults = await Promise.all(
        freshUser.isMemberOf.map((id) => groupsApi.getById(id)),
      );
      setAdminGroups(adminResults);
      setMemberGroups(memberResults);
    } catch (error) {
      console.error('loadDashboard failed:', error);
    }
  }, [user, refreshUser]);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    queueMicrotask(() => {
      void loadDashboard();
    });
    const interval = setInterval(() => {
      void loadDashboard();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, router, loadDashboard]);

  if (!user) return null;

  const handleGroupClick = async (groupId: number) => {
    const result = await syncGroup(groupId);
    if (!result) return;
    const isMember =
      result.members.includes(user.id) || result.admins.includes(user.id);
    if (!isMember) {
      await loadDashboard();
      return;
    }
    router.push('/manage_group');
  };

  return (
    <PageShell>
      <h1 className="font-heading text-3xl font-bold mb-2 text-center text-foreground">
        Manage Groups
      </h1>
      <p className="mb-8 text-muted-foreground text-center">
        Welcome back, <strong className="text-foreground">{user.name}</strong>!
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <UserSettings />
        <Button
          variant="accent"
          size="lg"
          fullWidth
          className="clay-tile clay-tile-create min-h-[5rem]"
          onClick={() => router.push('/create_group')}
        >
          Create New Group
        </Button>
        {adminGroups.map((group) => (
          <Button
            key={group.id}
            variant="primary"
            size="lg"
            fullWidth
            className="clay-tile clay-tile-admin min-h-[5rem]"
            onClick={() => handleGroupClick(group.id)}
          >
            {group.name}
          </Button>
        ))}
        {memberGroups.map((group) => (
          <Button
            key={group.id}
            variant="secondary"
            size="lg"
            fullWidth
            className="clay-tile clay-tile-member min-h-[5rem]"
            onClick={() => handleGroupClick(group.id)}
          >
            {group.name}
          </Button>
        ))}
      </div>
    </PageShell>
  );
}
