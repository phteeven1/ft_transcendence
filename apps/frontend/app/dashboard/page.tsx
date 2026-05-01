'use client';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Group } from '../types';

export default function Dashboard() {
  const { user, setCurrentGroup, refreshUser } = useAuth();
  const router = useRouter();
  const [adminGroups, setAdminGroups] = useState<Group[]>([]);
  const [memberGroups, setMemberGroups] = useState<Group[]>([]);

  if (!user) {
    router.push('/');
    return null;
  }

  // first useEffect: refresh user from backend on page load
  useEffect(() => {
    refreshUser();
  }, []);

  // second useEffect: fetch groups whenever user.userAdminGroups or userMemberGroups changes
  useEffect(() => {
    const fetchGroups = async () => {
      const adminResults = await Promise.all(
        user.userAdminGroups.map(id =>
          fetch(`http://localhost:4000/groups/${id}`).then(res => res.json())
        )
      );
      const memberResults = await Promise.all(
        user.userMemberGroups.map(id =>
          fetch(`http://localhost:4000/groups/${id}`).then(res => res.json())
        )
      );
      setAdminGroups(adminResults);
      setMemberGroups(memberResults);
    };
    fetchGroups();
  }, [user.userAdminGroups, user.userMemberGroups]);

  const handleGroupClick = (groupId: number) => {
    setCurrentGroup(groupId);
    router.push('/manage_group');
  };

  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="bg-emerald-200 max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Manage Groups</h1>
        <p className="mb-6 text-gray-600">
          Welcome, {user.userName}!
        </p>
        <div className="grid grid-cols-2 gap-4">
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