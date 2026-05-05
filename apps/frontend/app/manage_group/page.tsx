'use client';
import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Member } from '../types';
import MemberList from '../components/group/member-list';
import BackToDashboard from '../components/group/back-to-dashboard';
import LeaveGroup from '../components/group/leave-group';
import SendInvite from '../components/group/send-invite';
import PromoteToAdmin from '../components/group/promote-to-admin';
import ResignAdmin from '../components/group/resign-admin';
import RenameGroup from '../components/group/rename-group';
import CreatePlayer from '../components/group/create-player';

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

  useEffect(() => {
    const interval = setInterval(() => {
      syncAndRefresh();
    }, 5000);
    return () => clearInterval(interval);
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
    if (!group || !user) return;
    const updatedGroup = await syncGroup(group.groupId);
    if (!updatedGroup) return;

    const isStillMember =
      updatedGroup.groupMembers.includes(user.userId) ||
      updatedGroup.groupAdmins.includes(user.userId);

    if (!isStillMember) {
      leaveGroup();
      router.push('/dashboard');
      return;
    }

    await fetchMembers();
  };

  if (!user || !group) return null;

  const isAdmin = group.groupAdmins.includes(user.userId);

  const buttons = (
    <>
      <BackToDashboard />
      <LeaveGroup syncAndRefresh={syncAndRefresh} />
      {isAdmin && <SendInvite />}
      {isAdmin && <PromoteToAdmin currentGroupMembers={currentGroupMembers} syncAndRefresh={syncAndRefresh} />}
      {isAdmin && <ResignAdmin syncAndRefresh={syncAndRefresh} />}
      {isAdmin && <RenameGroup syncAndRefresh={syncAndRefresh} />}
      <CreatePlayer />
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
            <MemberList members={currentGroupMembers} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {buttons}
          </div>
        </div>

        {/* Desktop: three column layout */}
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          <div className="col-span-1 flex flex-col">
            <h2 className="text-lg font-semibold mb-2">Members</h2>
            <MemberList members={currentGroupMembers} />
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-3 content-start pt-9">
            {buttons}
          </div>
        </div>
      </div>
    </div>
  );
}