'use client';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { groupsApi } from '@/lib/api';
import { Group } from '../types';
import UserSettings from './_components/user-settings';
import { PageShell, Tile } from '../components/ui';

export default function Dashboard() {
  const t = useTranslations('dashboard');
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
        {t('title')}
      </h1>
      <p className="mb-8 text-muted-foreground text-center">
        {t('welcome', { name: user.name })}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <UserSettings />
        <Tile
          tileVariant="create"
          onClick={() => router.push('/create_group')}
        >
          {t('createNewGroup')}
        </Tile>
        {adminGroups.map((group) => (
          <Tile
            key={group.id}
            tileVariant="admin"
            onClick={() => handleGroupClick(group.id)}
          >
            {group.name}
          </Tile>
        ))}
        {memberGroups.map((group) => (
          <Tile
            key={group.id}
            tileVariant="member"
            onClick={() => handleGroupClick(group.id)}
          >
            {group.name}
          </Tile>
        ))}
      </div>
    </PageShell>
  );
}
