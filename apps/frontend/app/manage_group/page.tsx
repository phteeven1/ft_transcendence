'use client';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Member } from '../types';

export default function ManageGroup() {
  const { user, group, syncGroup, leaveGroup } = useAuth();
  const router = useRouter();
  const [currentGroupMembers, setCurrentGroupMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!user || !group) {
      router.push('/');
      return;
    }
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    if (!group) return;
    try {
      const res = await fetch(`http://localhost:4000/groups/${group.groupId}/members`);
      if (!res.ok) throw new Error(`Failed to fetch members: ${res.status}`);
      const members: Member[] = await res.json();
      setCurrentGroupMembers(members);
    } catch (error) {
      console.error('fetchMembers failed:', error);
    }
  };

  const syncAndRefresh = async () => {
    if (!group) return;
    await syncGroup(group.groupId);
    await fetchMembers();
  };

  const handleLeaveGroup = () => {
    leaveGroup();
    router.push('/dashboard');
  };

  if (!user || !group) return null;

  const isAdmin = group.groupAdmins.includes(user.userId);

  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="bg-emerald-200 max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">{group.groupName}</h1>
        <p className="text-sm text-gray-600 mb-6">
          You are {isAdmin ? 'an admin' : 'a member'} of this group.
        </p>

        <h2 className="text-lg font-semibold mb-2">Members</h2>
        <ul className="mb-6">
          {currentGroupMembers.map(member => (
            <li
              key={member.memberId}
              className="flex items-center justify-between py-2 border-b border-emerald-300"
            >
              <span>{member.memberName}</span>
              <span className="text-xs text-gray-500">
                {member.isAdmin ? 'Admin' : 'Member'}
              </span>
            </li>
          ))}
        </ul>

        <button
          onClick={handleLeaveGroup}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          Leave Group
        </button>
      </div>
    </div>
  );
}