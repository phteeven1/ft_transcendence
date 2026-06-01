'use client';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { groupsApi } from '@/lib/api';
import { Group } from '../types';

export default function Dashboard() {
  const { user, syncGroup, refreshUser } = useAuth();
  const router = useRouter();
  const [adminGroups, setAdminGroups] = useState<Group[]>([]);
  const [memberGroups, setMemberGroups] = useState<Group[]>([]);

  // refreshes current user from backend. Fetches data for all groups the user is admin of,
  // and all groups they are member of, and stores in state.
  const loadDashboard = async () => {
    if (!user) return;
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
  };

  // if no user, return to landing page
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user]);

  // re-loads dashboard every time user changes state
  useEffect(() => {
    loadDashboard();
  }, []);

  // re-loads dashboard every 5s, to make sure that changes done to group by another user is not missed
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  // fetches full data of clicked group via syncGroup. If user is member of admin, it navigates
  // to /manage_group, else reloads dashboard. This is safety check if user was just removed by admin
  // in another session, and automatic 5s refresh didn't happen yet
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

  // layout creates one button for Create New Croup, and one for each group the user is an admin or a member of.
  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-2 text-center">Manage Groups</h1>
        <p className="mb-6 text-gray-600 text-center">Welcome, {user.name}!</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/create_group')}
            className="bg-green-500 hover:bg-green-600 text-white font-medium py-4 px-4 rounded transition-colors"
          >
            Create New Group
          </button>
          {adminGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => handleGroupClick(group.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-4 rounded transition-colors"
            >
              {group.name}
            </button>
          ))}
          {memberGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => handleGroupClick(group.id)}
              className="bg-blue-400 hover:bg-blue-500 text-white font-medium py-4 px-4 rounded transition-colors"
            >
              {group.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
