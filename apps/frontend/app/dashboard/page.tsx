'use client';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Group } from '../types';

export default function Dashboard() {
  const { user, syncGroup, refreshUser } = useAuth();
  const router = useRouter();
  const [adminGroups, setAdminGroups] = useState<Group[]>([]);
  const [memberGroups, setMemberGroups] = useState<Group[]>([]);

  const loadDashboard = async () => {
    if (!user) return;
    await refreshUser();
    const freshUser = await fetch(`http://localhost:4000/users/${user.userId}`)
      .then(res => res.json());
    const adminResults = await Promise.all(
      freshUser.isAdminOf.map((id: number) =>
        fetch(`http://localhost:4000/groups/${id}`).then(res => res.json())
      )
    );
    const memberResults = await Promise.all(
      freshUser.isMemberOf.map((id: number) =>
        fetch(`http://localhost:4000/groups/${id}`).then(res => res.json())
      )
    );
    setAdminGroups(adminResults);
    setMemberGroups(memberResults);
  };

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user]);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const handleGroupClick = async (groupId: number) => {
    const result = await syncGroup(groupId);
    if (!result) return;

    const isMember = result.groupMembers.includes(user.userId) ||
      result.groupAdmins.includes(user.userId);

    if (!isMember) {
      await loadDashboard();
      return;
    }

    router.push('/manage_group');
  };

  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-2 text-center">Manage Groups</h1>
        <p className="mb-6 text-gray-600 text-center">
          Welcome, {user.userName}!
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/create_group')}
            className="bg-green-500 hover:bg-green-600 text-white font-medium py-4 px-4 rounded transition-colors"
          >
            Create New Group
          </button>
          {adminGroups.map(group => (
            <button
              key={group.groupId}
              onClick={() => handleGroupClick(group.groupId)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-4 rounded transition-colors"
            >
              {group.groupName}
            </button>
          ))}
          {memberGroups.map(group => (
            <button
              key={group.groupId}
              onClick={() => handleGroupClick(group.groupId)}
              className="bg-blue-400 hover:bg-blue-500 text-white font-medium py-4 px-4 rounded transition-colors"
            >
              {group.groupName}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}