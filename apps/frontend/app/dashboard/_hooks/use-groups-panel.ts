'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Group } from '../../types';
import { DASHBOARD_POLL_INTERVAL_MS } from './poll-interval';

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
  const { user, group, player, syncGroup, refreshUser, leaveGroup } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [actionGroup, setActionGroup] = useState<Group | null>(null);
  const [groupDialog, setGroupDialog] = useState<GroupAction | null>(null);

  const userId = user?.id;
  const selectedGroupId = group?.id;
  const restoreGroupId = user?.currentGroup;
  const hasGroup = Boolean(group);

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
    } catch (error) {
      console.error('loadGroups failed:', error);
    }
  }, [userId, refreshUser]);

  useEffect(() => {
    if (!userId || player) return;
    const tick = (): void => {
      void loadGroups();
    };
    const timeoutId = window.setTimeout(tick, 0);
    const interval = setInterval(tick, DASHBOARD_POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, [userId, player, loadGroups]);

  useEffect(() => {
    if (player || !userId || hasGroup || !restoreGroupId) return;
    void (async () => {
      const synced = await syncGroup(restoreGroupId);
      if (!synced) return;
      const isMember =
        synced.members.includes(userId) || synced.admins.includes(userId);
      if (!isMember) leaveGroup();
    })();
  }, [userId, restoreGroupId, hasGroup, player, syncGroup, leaveGroup]);

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
