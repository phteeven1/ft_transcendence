'use client';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Member } from '../types';

export default function ManageGroup() {
  const { user, group, syncGroup, leaveGroup, refreshUser } = useAuth();
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

  const handleBackToDashboard = () => {
    leaveGroup();
    router.push('/dashboard');
  };

  const handleLeaveGroup = async () => {
    if (!user || !group) return;

    const totalMembers = group.groupMembers.length + group.groupAdmins.length;
    const isOnlyAdmin = group.groupAdmins.includes(user.userId) &&
      group.groupAdmins.length === 1;
    const isLastMember = totalMembers === 1;

    const confirmed = window.confirm(
      `Are you sure you want to permanently leave ${group.groupName}?`
    );
    if (!confirmed) return;

    if (isOnlyAdmin && !isLastMember) {
      window.alert(
        'You are the only admin of this group. Before leaving, you need to make another member admin.'
      );
      return;
    }

    if (isLastMember) {
      const confirmedDelete = window.confirm(
        `You are the last member of ${group.groupName}. If you leave, the group will be permanently removed.`
      );
      if (!confirmedDelete) return;
    }

    try {
      const res = await fetch('http://localhost:4000/groups/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: group.groupId, userId: user.userId }),
      });
      if (!res.ok) throw new Error(`Failed to leave group: ${res.status}`);
      await refreshUser();
      leaveGroup();
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to leave group:', error);
      window.alert('Something went wrong. Please try again.');
    }
  };

  if (!user || !group) return null;

  const isAdmin = group.groupAdmins.includes(user.userId);

  const memberList = (
    <ul className="overflow-y-auto max-h-64 md:max-h-full md:h-full border border-emerald-300 rounded">
      {currentGroupMembers.map(member => (
        <li
          key={member.memberId}
          className="flex items-center justify-between px-3 py-2 border-b border-emerald-300 last:border-b-0"
        >
          <span>{member.memberName}</span>
          <span className="text-xs text-gray-500">
            {member.isAdmin ? 'Admin' : 'Member'}
          </span>
        </li>
      ))}
    </ul>
  );

  const buttons = (
    <>
      <button
        onClick={handleBackToDashboard}
        className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded transition-colors"
      >
        Back to Dashboard
      </button>
      <button
        onClick={handleLeaveGroup}
        className="bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded transition-colors"
      >
        Leave Group
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-2 text-center">{group.groupName}</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          You are {isAdmin ? 'an admin' : 'a member'} of this group.
        </p>

        {/* Mobile: stacked layout */}
        <div className="md:hidden flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Members</h2>
            {memberList}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {buttons}
          </div>
        </div>

        {/* Desktop: three column layout */}
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          <div className="col-span-1 flex flex-col">
            <h2 className="text-lg font-semibold mb-2">Members</h2>
            {memberList}
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-3 content-start pt-9">
            {buttons}
          </div>
        </div>

      </div>
    </div>
  );
}