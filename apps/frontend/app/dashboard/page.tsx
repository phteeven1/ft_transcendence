'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../context/auth-context';
import { groupsApi, playersApi, vocabulariesApi } from '@/lib/api';
import { Group, Member, Player, Vocabulary } from '../types';
import { PageShell, Panel } from '../components/ui';
import GroupsPanel, { GroupAction } from './_components/groups-panel';
import PeoplePanel, {
  PeopleTab,
  PlayerAction,
  VocabularyAction,
  MemberAction,
} from './_components/people-panel';
import RenameGroup from './_components/rename-group';
import LeaveGroup from './_components/leave-group';
import DeleteGroup from './_components/delete-group';
import MemberDialog from './_components/member-dialog';
import RenamePlayer from './_components/rename-player';
import DeletePlayer from './_components/delete-player';
import InviteToPlay from './_components/invite-to-play';
import RenameVocabulary from './_components/rename-vocabulary';
import EditVocabulary from './_components/edit-vocabulary';
import DeleteVocabulary from './_components/delete-vocabulary';
import { TEST_VOCABULARY } from './_components/test-vocabulary';

function isPeopleTab(value: string | null): value is PeopleTab {
  return value === 'members' || value === 'players' || value === 'vocabulary';
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const t = useTranslations('dashboard');
  const { user, group, player, syncGroup, refreshUser, leaveGroup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');

  const [groups, setGroups] = useState<Group[]>([]);
  const [actionGroup, setActionGroup] = useState<Group | null>(null);
  const [groupDialog, setGroupDialog] = useState<GroupAction | null>(null);

  const [currentGroupMembers, setCurrentGroupMembers] = useState<Member[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isPlayersLoading, setIsPlayersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<PeopleTab>(
    isPeopleTab(requestedTab) ? requestedTab : 'members',
  );

  const [actionMember, setActionMember] = useState<Member | null>(null);
  const [memberDialog, setMemberDialog] = useState<MemberAction | null>(null);

  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [playerDialog, setPlayerDialog] = useState<PlayerAction | null>(null);
  const [isPlayOpen, setIsPlayOpen] = useState(false);

  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [actionVocabulary, setActionVocabulary] = useState<Vocabulary | null>(
    null,
  );
  const [vocabDialog, setVocabDialog] = useState<VocabularyAction | null>(null);
  const [isVocabLoading, setIsVocabLoading] = useState(false);

  const selectedGroupId = group?.id;
  const userId = user?.id;
  const restoreGroupId = user?.currentGroup;
  const hasGroup = Boolean(group);
  const isAdminOfSelected = Boolean(
    userId && group && group.admins.includes(userId),
  );

  const loadDashboard = useCallback(async () => {
    if (!userId) return;
    try {
      const freshUser = await refreshUser();
      if (!freshUser) return;
      const results = await Promise.all(
        [...freshUser.isAdminOf, ...freshUser.isMemberOf].map((id) =>
          groupsApi.getById(id),
        ),
      );
      results.sort((a, b) => a.name.localeCompare(b.name));
      setGroups(results);
    } catch (error) {
      console.error('loadDashboard failed:', error);
    }
  }, [userId, refreshUser]);

  const fetchMembers = useCallback(async () => {
    if (!selectedGroupId) return;
    try {
      const members = await groupsApi.getMembers(selectedGroupId);
      setCurrentGroupMembers(members);
    } catch (error) {
      console.error('fetchMembers failed:', error);
    }
  }, [selectedGroupId]);

  const fetchPlayers = useCallback(async () => {
    if (!selectedGroupId) return;
    try {
      const data = await playersApi.findByGroup(selectedGroupId);
      setPlayers(data);
    } catch (error) {
      console.error('fetchPlayers failed:', error);
    } finally {
      setIsPlayersLoading(false);
    }
  }, [selectedGroupId]);

  const fetchVocabularies = useCallback(async () => {
    if (!selectedGroupId || !userId) return;
    try {
      let data = await vocabulariesApi.findByGroup(selectedGroupId);

      const hasTestList = data.some((v) => v.name === TEST_VOCABULARY.name);
      if (!hasTestList) {
        const created = await vocabulariesApi.create({
          vocabularyInGroup: selectedGroupId,
          byUser: userId,
          vocabularyName: TEST_VOCABULARY.name,
          vocabularyWords: TEST_VOCABULARY.words,
          vocabularyMeanings: TEST_VOCABULARY.meanings,
        });
        data = [...data, created];
      }

      setVocabularies(data);
    } catch (error) {
      console.error('fetchVocabularies failed:', error);
    } finally {
      setIsVocabLoading(false);
    }
  }, [selectedGroupId, userId]);

  const syncAndRefresh = useCallback(async () => {
    if (!selectedGroupId || !userId) return;
    try {
      const updatedGroup = await syncGroup(selectedGroupId);
      if (!updatedGroup) return;

      const isStillMember =
        updatedGroup.members.includes(userId) ||
        updatedGroup.admins.includes(userId);

      if (!isStillMember) {
        leaveGroup();
        await loadDashboard();
        return;
      }

      await Promise.all([fetchMembers(), fetchPlayers()]);
    } catch (error) {
      console.error('syncAndRefresh failed:', error);
    }
  }, [
    selectedGroupId,
    userId,
    syncGroup,
    leaveGroup,
    loadDashboard,
    fetchMembers,
    fetchPlayers,
  ]);

  useEffect(() => {
    if (player) return;
    if (!userId) {
      router.push('/');
      return;
    }
    void loadDashboard();
  }, [userId, player, router, loadDashboard]);

  useEffect(() => {
    if (player || !userId || hasGroup || !restoreGroupId) return;
    void (async () => {
      const synced = await syncGroup(restoreGroupId);
      if (!synced) return;
      const isMember =
        synced.members.includes(userId) || synced.admins.includes(userId);
      if (!isMember) leaveGroup();
    })();
  }, [userId, restoreGroupId, hasGroup, player, syncGroup, leaveGroup]);

  useEffect(() => {
    if (!selectedGroupId) {
      setCurrentGroupMembers([]);
      setPlayers([]);
      setIsPlayersLoading(false);
      setVocabularies([]);
      setIsVocabLoading(false);
      return;
    }
    setIsPlayersLoading(true);
    void fetchMembers();
    void fetchPlayers();
    if (isAdminOfSelected) {
      setIsVocabLoading(true);
      void fetchVocabularies();
    } else {
      setVocabularies([]);
      setIsVocabLoading(false);
    }
  }, [
    selectedGroupId,
    isAdminOfSelected,
    fetchMembers,
    fetchPlayers,
    fetchVocabularies,
  ]);

  useEffect(() => {
    if (!user || player) return;
    const interval = setInterval(() => {
      void loadDashboard();
      void syncAndRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [userId, player, loadDashboard, syncAndRefresh]);

  useEffect(() => {
    if (activeTab === 'vocabulary' && user && group && !group.admins.includes(user.id)) {
      setActiveTab('members');
    }
  }, [activeTab, user, group]);

  const closeGroupDialog = () => {
    setGroupDialog(null);
    setActionGroup(null);
  };

  const handleGroupAction = (action: GroupAction, target: Group) => {
    setActionGroup(target);
    setGroupDialog(action);
  };

  const handleGroupSelect = async (groupId: number) => {
    if (!user) return;
    const result = await syncGroup(groupId);
    if (!result) return;
    const isMember =
      result.members.includes(user.id) || result.admins.includes(user.id);
    if (!isMember) {
      await loadDashboard();
    }
  };

  const closeMemberDialog = () => {
    setMemberDialog(null);
    setActionMember(null);
  };

  const handleMemberAction = (action: MemberAction, member?: Member) => {
    setActionMember(member ?? null);
    setMemberDialog(action);
  };

  const closePlayerDialog = () => {
    setPlayerDialog(null);
    setActivePlayer(null);
  };

  const handlePlayerAction = (action: PlayerAction, target: Player) => {
    setActivePlayer(target);
    setPlayerDialog(action);
  };

  const handlePlay = (target: Player) => {
    setActivePlayer(target);
    setIsPlayOpen(true);
  };

  const handlePlayerCreated = (created: Player) => {
    setPlayers((prev) => [...prev, created]);
  };

  const handlePlayerUpdated = (updated: Player) => {
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setActivePlayer(updated);
  };

  const handlePlayerDeleted = (playerId: number) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    closePlayerDialog();
  };

  const activateVocabulary = async (vocabulary: Vocabulary) => {
    if (!group || !user) return;
    if (vocabulary.id === group.currentVocabulary) return;
    try {
      const updated = await vocabulariesApi.setActive({
        vocabularyId: vocabulary.id,
        vocabularyInGroup: group.id,
        authorId: user.id,
      });
      if (!updated) throw new Error('Failed to activate vocabulary');
      await syncGroup(group.id);
    } catch (error) {
      console.error('setActive vocabulary failed:', error);
    }
  };

  const closeVocabDialog = () => {
    setVocabDialog(null);
    setActionVocabulary(null);
  };

  const handleVocabAction = (action: VocabularyAction, target: Vocabulary) => {
    setActionVocabulary(target);
    setVocabDialog(action);
  };

  const handleVocabularyImported = (vocabulary: Vocabulary) => {
    setVocabularies((prev) => [...prev, vocabulary]);
    void activateVocabulary(vocabulary);
  };

  const handleVocabularyUpdated = (updated: Vocabulary) => {
    setVocabularies((prev) =>
      prev.map((v) => (v.id === updated.id ? updated : v)),
    );
  };

  const handleVocabularyDeleted = (vocabularyId: number) => {
    setVocabularies((prev) => prev.filter((v) => v.id !== vocabularyId));
    if (group && vocabularyId === group.currentVocabulary) {
      void syncGroup(group.id);
    }
  };

  if (!user || player) return null;

  const isAdmin = group ? group.admins.includes(user.id) : false;

  return (
    <PageShell wide>
      <div className="flex flex-col md:grid md:grid-cols-5 gap-4 lg:gap-6">
        <div className="md:col-span-2 flex flex-col">
          <GroupsPanel
            groups={groups}
            selectedGroupId={selectedGroupId}
            currentUserId={user.id}
            onSelect={(groupId) => void handleGroupSelect(groupId)}
            onAction={handleGroupAction}
            onCreated={loadDashboard}
          />
        </div>

        <div className="md:col-span-3 flex flex-col gap-3">
          {group ? (
            <>
              <PeoplePanel
                groupName={group.name}
                members={currentGroupMembers}
                players={players}
                isPlayersLoading={isPlayersLoading}
                isAdmin={isAdmin}
                currentUserId={user.id}
                hasActiveVocabulary={!!group.currentVocabulary}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onMemberAction={handleMemberAction}
                onPlayerAction={handlePlayerAction}
                onPlay={handlePlay}
                onPlayerCreated={handlePlayerCreated}
                vocabularies={vocabularies}
                currentVocabulary={group.currentVocabulary}
                isVocabLoading={isVocabLoading}
                onSelectVocabulary={activateVocabulary}
                onVocabularyImported={handleVocabularyImported}
                onVocabAction={handleVocabAction}
              />
            </>
          ) : (
            <Panel className="p-4 sm:p-5">
              <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground italic">
                {t('selectGroup')}
              </p>
            </Panel>
          )}
        </div>
      </div>

      <RenameGroup
        group={actionGroup}
        open={groupDialog === 'rename'}
        onClose={closeGroupDialog}
        onDone={loadDashboard}
      />
      <LeaveGroup
        group={actionGroup}
        open={groupDialog === 'leave'}
        onClose={closeGroupDialog}
        onDone={loadDashboard}
      />
      <DeleteGroup
        group={actionGroup}
        open={groupDialog === 'delete'}
        onClose={closeGroupDialog}
        onDone={loadDashboard}
      />
      <MemberDialog
        action={memberDialog}
        member={actionMember}
        open={memberDialog !== null}
        onClose={closeMemberDialog}
        syncAndRefresh={syncAndRefresh}
      />
      <RenamePlayer
        player={activePlayer}
        open={playerDialog === 'rename'}
        onClose={closePlayerDialog}
        onRenamed={handlePlayerUpdated}
      />
      <DeletePlayer
        player={activePlayer}
        open={playerDialog === 'delete'}
        onClose={closePlayerDialog}
        onDeleted={handlePlayerDeleted}
      />
      <InviteToPlay
        player={activePlayer}
        open={isPlayOpen}
        onClose={() => {
          setIsPlayOpen(false);
          if (playerDialog === null) setActivePlayer(null);
        }}
      />
      <RenameVocabulary
        vocabulary={actionVocabulary}
        open={vocabDialog === 'rename'}
        onClose={closeVocabDialog}
        onRenamed={handleVocabularyUpdated}
      />
      <EditVocabulary
        vocabulary={actionVocabulary}
        open={vocabDialog === 'edit'}
        onClose={closeVocabDialog}
        onEdited={handleVocabularyUpdated}
      />
      <DeleteVocabulary
        vocabulary={actionVocabulary}
        open={vocabDialog === 'delete'}
        onClose={closeVocabDialog}
        onDeleted={handleVocabularyDeleted}
      />
    </PageShell>
  );
}
