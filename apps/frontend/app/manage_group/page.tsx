'use client';

/*
Layout for manage group
Will sync and refresh the group and the attached members and admins arrays every 5 s.
*/

import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Member } from '../types';

// All buttons are extracted to manage_group/_components, and imported here
import MemberList from './_components/member-list';
import BackToDashboard from './_components/back-to-dashboard';
import LeaveGroup from './_components/leave-group';
import SendInvite from './_components/send-invite';
import PromoteToAdmin from './_components/promote-to-admin';
import ResignAdmin from './_components/resign-admin';
import RenameGroup from './_components/rename-group';
import ManagePlayers from './_components/manage-players';
import ExpelMember from './_components/expel-member';
import DeleteGroup from './_components/delete-group';
import ManageVocabulary from './_components/manage-vocabulary';

export default function ManageGroup() {
  const { user, group, syncGroup, leaveGroup } = useAuth();
  const router = useRouter();
  const [currentGroupMembers, setCurrentGroupMembers] = useState<Member[]>([]);

  // Guard. Sends to landing page if no user or no group
  useEffect(() => {
    if (!user || !group) {
      router.push('/');
      return;
    }
    fetchMembers();
  }, []);

  // forces refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      syncAndRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // fetches the full Member objects for the current group from backend and stores in currentGroupMembers
  // this is used to populate MemberList and is also passed as props to functions that
  // needs to know who is in the group
  const fetchMembers = async () => {
    if (!group) return;
    try {
      const res = await fetch(
        `http://localhost:4000/groups/${group.id}/members`,
      );
      if (!res.ok) throw new Error(`Failed to fetch members: ${res.status}`);
      const members: Member[] = await res.json();
      setCurrentGroupMembers(members);
    } catch (error) {
      console.error('fetchMembers failed:', error);
    }
  };

  // this function is called every 5s to keep page in sync with changes made by others
  // syncs the current group from backend via syncGroup -
  // if user has been removed, it clears the group from both auth context via leaveGroup
  // and redirects to /dashboard, otherwise, it calls fetchMember to refresh member list
  const syncAndRefresh = async () => {
    if (!group || !user) return;
    const updatedGroup = await syncGroup(group.id);
    if (!updatedGroup) return;

    const isStillMember =
      updatedGroup.members.includes(user.id) ||
      updatedGroup.admins.includes(user.id);

    if (!isStillMember) {
      leaveGroup();
      router.push('/dashboard');
      return;
    }

    await fetchMembers();
  };

  if (!user || !group) return null;

  const isAdmin = group.admins.includes(user.id);

  const buttons = (
    <>
      {/* This is a list of all buttons, with conditonal for admin when appropriate */}
      <ManagePlayers />
      {isAdmin && <ManageVocabulary />}
      {isAdmin && <SendInvite />}
      {isAdmin && <RenameGroup syncAndRefresh={syncAndRefresh} />}
      <LeaveGroup syncAndRefresh={syncAndRefresh} />
      {isAdmin && (
        <PromoteToAdmin
          currentGroupMembers={currentGroupMembers}
          syncAndRefresh={syncAndRefresh}
        />
      )}
      {isAdmin && <ResignAdmin syncAndRefresh={syncAndRefresh} />}
      {isAdmin && (
        <ExpelMember
          currentGroupMembers={currentGroupMembers}
          syncAndRefresh={syncAndRefresh}
        />
      )}
      {isAdmin && <DeleteGroup syncAndRefresh={syncAndRefresh} />}
      <BackToDashboard />
    </>
  );

  // layout
  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-2 text-center">{group.name}</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">
          You are {isAdmin ? 'an admin' : 'a member'} of this group.
        </p>

        {/* Mobile: stacked layout */}
        <div className="md:hidden flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Members</h2>
            <MemberList members={currentGroupMembers} />
          </div>
          <div className="grid grid-cols-2 gap-3">{buttons}</div>
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
