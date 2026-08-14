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
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { PageShell } from '../components/ui';

export default function ManageGroup() {
  const t = useTranslations('group');
  const { user, group, syncGroup, leaveGroup } = useAuth();
  const router = useRouter();
  const [currentGroupMembers, setCurrentGroupMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!group) return;
    try {
      const members = await groupsApi.getMembers(group.id);
      setCurrentGroupMembers(members);
      setSelectedMember((prev) => prev ?? members.find((m) => m.id === user?.id) ?? null);
    } catch (error) {
      console.error('fetchMembers failed:', error);
    }
  }, [group, user]);

  const syncAndRefresh = useCallback(async () => {
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
  }, [group, user, syncGroup, leaveGroup, router, fetchMembers]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!user) {
        if (!cancelled) router.push('/signin');
        return;
      }

      if (!group) {
        if (user.currentGroup) {
          const synced = await syncGroup(user.currentGroup);
          if (!cancelled && synced) return;
        }
        if (!cancelled) router.push('/dashboard');
        return;
      }

      fetchMembers();
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [user, group, router, syncGroup, fetchMembers]);

  useEffect(() => {
    if (!group || !user) return;

    const interval = setInterval(() => {
      void syncAndRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [group, user, syncAndRefresh]);

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
      {isAdmin && <RenameGroup syncAndRefresh={syncAndRefresh} />}
      <LeaveGroup />
      {isAdmin && <DeleteGroup />}
      <BackToDashboard />
    </>
  );

  return (
    <PageShell>
      {/* Mobile portrait (below md): single column stack */}
      <div className="flex flex-col gap-4 md:hidden">
        <MemberList
          members={currentGroupMembers}
          selectedMember={selectedMember}
          onSelect={setSelectedMember}
        />
        <ActionWindow selectedMember={selectedMember} />
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
          <ActionWindow selectedMember={selectedMember} />
        </div>
        <div className="col-span-1 grid grid-cols-2 gap-2">
          {buttons}
        </div>
      </div>

      {/* Desktop (lg+): member list + buttons side by side, action window below */}
      <div className="hidden lg:flex flex-col gap-6">
        <div className="hidden lg:block text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground">{group.name}</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? t('roleAdmin') : t('roleMember')}
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
        <ActionWindow selectedMember={selectedMember} />
      </div>
    </PageShell>
  );
}
