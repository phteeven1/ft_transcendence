'use client';

import { useEffect } from 'react';
import { acquireSocket, releaseSocket } from '@/lib/socket';

type Options = {
  userId: number;
  groupId: number;
  enabled: boolean;
  onDashboardUpdate: () => void;
  onMembershipChanged: () => void;
};

export function useDashboardSocket({
  userId,
  groupId,
  enabled,
  onDashboardUpdate,
  onMembershipChanged,
}: Options): void {
  useEffect(() => {
    if (!enabled || userId <= 0) return;

    let active = true;
    const key = `dashboard:${userId}`;
    const socket = acquireSocket(key);

    const join = (): void => {
      if (!active) return;
      socket.emit('joinDashboard', { groupId, userId });
    };

    const handleDashboardUpdate = (): void => {
      if (!active) return;
      onDashboardUpdate();
    };

    const handleMembershipChanged = (): void => {
      if (!active) return;
      onMembershipChanged();
    };

    socket.on('connect', join);
    socket.on('dashboard:update', handleDashboardUpdate);
    socket.on('membership:changed', handleMembershipChanged);

    if (socket.connected) join();

    return () => {
      active = false;
      socket.off('connect', join);
      socket.off('dashboard:update', handleDashboardUpdate);
      socket.off('membership:changed', handleMembershipChanged);
      releaseSocket(key);
    };
  }, [userId, groupId, enabled, onDashboardUpdate, onMembershipChanged]);
}
