'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Group } from '../../types';
import { useDashboardLive } from './dashboard-live';

export type GroupAction = 'rename' | 'leave' | 'delete';

export type UseGroupsPanelResult = {
  groups: Group[];
  selectedGroupId: number | undefined;
  currentUserId: number;
  loadGroups: () => Promise<void>;
  selectGroup: (groupId: number) => Promise<void>;
  actionGroup: Group | null;
  groupDialog: GroupAction | null;
  handleAction: (action: GroupAction, group: Group) => void;
  closeDialog: () => void;
};

export function useGroupsPanel(): UseGroupsPanelResult {
  const { user, group, player, syncGroup, refreshUser } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [actionGroup, setActionGroup] = useState<Group | null>(null);
  const [groupDialog, setGroupDialog] = useState<GroupAction | null>(null);

  const userId = user?.id;
  const selectedGroupId = group?.id;

  const loadGroups = useCallback(async (): Promise<void> => {
    if (!userId) return;
    try {
      const freshUser = await refreshUser();
      if (!freshUser) return;
      const results = await Promise.all(
        [...freshUser.isAdminOf, ...freshUser.isMemberOf].map((id) =>
          groupsApi.getById(id),
        ),
      );
      results.sort((a, b) => a.name.localeCompare(b.name));
      setGroups(results);
    } catch {
      /* keep last groups */
    }
  }, [userId, refreshUser]);

  useEffect(() => {
    if (!userId || player) return;
    const timeoutId = window.setTimeout(() => {
      void loadGroups();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [userId, player, loadGroups]);

  useDashboardLive(loadGroups);

  const selectGroup = useCallback(
    async (groupId: number): Promise<void> => {
      if (!user) return;
      const result = await syncGroup(groupId);
      if (!result) return;
      const isMember =
        result.members.includes(user.id) || result.admins.includes(user.id);
      if (!isMember) {
        await loadGroups();
      }
    },
    [user, syncGroup, loadGroups],
  );

  const handleAction = (action: GroupAction, target: Group): void => {
    setActionGroup(target);
    setGroupDialog(action);
  };

  const closeDialog = (): void => {
    setGroupDialog(null);
    setActionGroup(null);
  };

  return {
    groups,
    selectedGroupId,
    currentUserId: userId ?? 0,
    loadGroups,
    selectGroup,
    actionGroup,
    groupDialog,
    handleAction,
    closeDialog,
  };
}
