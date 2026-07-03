'use client';

/*
Layout for manage group
Will sync and refresh the group and the attached members and admins arrays every 5 s.
Three responsive tiers:
  - Mobile portrait (below md): single column stack
  - Landscape mobile (md to lg, landscape): three column, compact inline header
  - Desktop (lg+): three column, large centered header
*/

import { useAuth } from '../context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { groupsApi } from '@/lib/api';
import { Member } from '../types';
import MemberList from './_components/member-list';
import ActionWindow from './_components/action-window';
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
import { chatApi } from '@/lib/api/chat';
import type { GroupChatEntryDto } from '@/lib/api/chat';
import AdminToAdmins from './_components/admin-to-admins';
import AdminToGroup from './_components/admin-to-group';
import MemberToAdmin from './_components/member-to-admin';

export default function ManageGroup() {
  const { user, group, syncGroup, leaveGroup } = useAuth();
  const router = useRouter();
  const [currentGroupMembers, setCurrentGroupMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [chatEntries, setChatEntries] = useState<GroupChatEntryDto[]>([]);

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
      await fetchChatEntries();
    } catch (error) {
      console.error('fetchMembers failed:', error);
    }
  };

  const fetchChatEntries = async () => {
    if (!group) return;
    try {
      const entries = await chatApi.getEntries(group.id);
      setChatEntries(entries);
    } catch (error) {
      console.error('fetchChatEntries failed:', error);
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
      await fetchChatEntries();
    } catch (error) {
      console.error('syncAndRefresh failed:', error);
    }
  };

  if (!user || !group) return null;

  const isAdmin = group.admins.includes(user.id);

  const buttons = (
    <>
      <ManagePlayers />
      {isAdmin && <ManageVocabulary />}
      {isAdmin && (
        <PromoteToAdmin
          currentGroupMembers={currentGroupMembers}
          syncAndRefresh={syncAndRefresh}
        />
      )}
      {isAdmin && <ResignAdmin syncAndRefresh={syncAndRefresh} />}
      {isAdmin && <SendInvite />}
      {isAdmin && (
        <ExpelMember
          currentGroupMembers={currentGroupMembers}
          syncAndRefresh={syncAndRefresh}
        />
      )}
      {isAdmin && <AdminToAdmins syncAndRefresh={syncAndRefresh} />}
      {isAdmin && <AdminToGroup syncAndRefresh={syncAndRefresh} />}
      {isAdmin && <RenameGroup syncAndRefresh={syncAndRefresh} />}
      <LeaveGroup syncAndRefresh={syncAndRefresh} />
      {!isAdmin && <MemberToAdmin syncAndRefresh={syncAndRefresh} />}
      {isAdmin && <DeleteGroup syncAndRefresh={syncAndRefresh} />}
      <BackToDashboard />
    </>
  );

  return (
    <div className="min-h-screen bg-emerald-200">
      <div className="max-w-4xl mx-auto p-4">

        {/* Mobile portrait (below md): single column stack */}
        <div className="flex flex-col gap-4 md:hidden">
          <MemberList
            members={currentGroupMembers}
            selectedMember={selectedMember}
            onSelect={setSelectedMember}
          />
          <ActionWindow
            selectedMember={selectedMember}
            groupId={group.id}
            members={currentGroupMembers}
            chatEntries={chatEntries}
            isAdmin={isAdmin}
          />
          <div className="grid grid-cols-2 gap-3">{buttons}</div>
        </div>

        {/* Landscape mobile (md to lg): three columns side by side, no header */}
        <div className="hidden md:grid lg:hidden grid-cols-3 gap-3 items-start">
          <div className="col-span-1">
            <MemberList
              members={currentGroupMembers}
              selectedMember={selectedMember}
              onSelect={setSelectedMember}
            />
          </div>
          <div className="col-span-1">
            <ActionWindow
              selectedMember={selectedMember}
              groupId={group.id}
              members={currentGroupMembers}
              chatEntries={chatEntries}
              isAdmin={isAdmin}
            />
          </div>
          <div className="col-span-1 grid grid-cols-2 gap-2 [&_button]:py-1 [&_button]:text-s">
            {buttons}
          </div>
        </div>

        {/* Desktop (lg+): member list + buttons side by side, action window below */}
        <div className="hidden lg:flex flex-col gap-6">
          <div className="hidden lg:block text-center">
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <p className="text-sm text-gray-600">
              You are {isAdmin ? 'an admin' : 'a member'} of this group.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1 flex flex-col">
              <MemberList
                members={currentGroupMembers}
                selectedMember={selectedMember}
                onSelect={setSelectedMember}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3 content-start">
                {buttons}
              </div>
            </div>
          </div>
          <ActionWindow
            selectedMember={selectedMember}
            groupId={group.id}
            members={currentGroupMembers}
            chatEntries={chatEntries}
            isAdmin={isAdmin}
          />
        </div>

      </div>
    </div>
  );
}