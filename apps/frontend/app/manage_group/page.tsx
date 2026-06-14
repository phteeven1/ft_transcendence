'use client';

/*
Layout for manage group
Will sync and refresh the group and the attached members and admins arrays every 5 s.
*/

import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { groupsApi } from '@/lib/api';
import { Member } from '../types';

import MemberList from './_components/member-list';
import MemberProfile from './_components/member-profile';
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
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

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
      const members = await groupsApi.getMembers(group.id);
      setCurrentGroupMembers(members);
      setSelectedMember(prev => prev ?? members.find(m => m.id === user?.id) ?? null);
    } catch (error) {
      console.error('fetchMembers failed:', error);
    }
  };

  const syncAndRefresh = async () => {
    if (!group || !user) return;
    try {
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
    } catch (error) {
      console.error('syncAndRefresh failed:', error);
    }
  };

  if (!user || !group) return null;

  const isAdmin = group.admins.includes(user.id);

  const groupHeader = (
    <>
      <h1 className="text-lg font-semibold">{group.name}</h1>
      <p className="text-sm text-gray-600">
        You are {isAdmin ? 'an admin' : 'a member'} of this group.
      </p>
    </>
  );

  const buttons = (
    <>
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

  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="max-w-4xl mx-auto p-4">

        {/* Desktop: large centered header above everything */}
        <div className="hidden md:block text-center mb-6">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-sm text-gray-600">
            You are {isAdmin ? 'an admin' : 'a member'} of this group.
          </p>
        </div>

        {/* Mobile portrait: single column, small header above member list */}
        <div className="md:hidden flex flex-col gap-4">
          <div>
            <div className="mb-2">{groupHeader}</div>
            <h2 className="text-lg font-semibold mb-2">Members</h2>
            <MemberList
              members={currentGroupMembers}
              selectedMember={selectedMember}
              onSelect={setSelectedMember}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">{buttons}</div>
          {selectedMember && <MemberProfile member={selectedMember} />}
        </div>

        {/* Desktop / landscape: three column layout */}
        <div className="hidden md:flex md:flex-col md:gap-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1 flex flex-col">
              <h2 className="text-lg font-semibold mb-2">Members</h2>
              <MemberList
                members={currentGroupMembers}
                selectedMember={selectedMember}
                onSelect={setSelectedMember}
              />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-3 content-start pt-9">
              {buttons}
            </div>
          </div>
          {selectedMember && <MemberProfile member={selectedMember} />}
        </div>

      </div>
    </div>
  );
}