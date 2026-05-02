'use client';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Group } from '../types';

export default function Dashboard() {
  const { user, syncGroup, refreshUser } = useAuth();
  const router = useRouter();
  const [adminGroups, setAdminGroups] = useState<Group[]>([]);
  const [memberGroups, setMemberGroups] = useState<Group[]>([]);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user]);

  useEffect(() => {
    if (user && !hasFetched.current) {
      hasFetched.current = true;
      refreshUser();
    }
  }, []);

  useEffect(() => {
    if (!user?.isAdminOf || !user?.isMemberOf) return;

    const fetchGroups = async () => {
      try {
        const adminResults = await Promise.all(
          user.isAdminOf.map(id =>
            fetch(`http://localhost:4000/groups/${id}`).then(res => {
              if (!res.ok) throw new Error(`Failed to fetch group ${id}`);
              return res.json();
            })
          )
        );
        const memberResults = await Promise.all(
          user.isMemberOf.map(id =>
            fetch(`http://localhost:4000/groups/${id}`).then(res => {
              if (!res.ok) throw new Error(`Failed to fetch group ${id}`);
              return res.json();
            })
          )
        );
        setAdminGroups(adminResults);
        setMemberGroups(memberResults);
      } catch (error) {
        console.error('Failed to fetch groups:', error);
      }
    };

    fetchGroups();
  }, [user?.isAdminOf.join(','), user?.isMemberOf.join(',')]);

  if (!user) return null;

  const handleGroupClick = async (groupId: number) => {
    const result = await syncGroup(groupId);
    if (result) router.push('/manage_group');
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