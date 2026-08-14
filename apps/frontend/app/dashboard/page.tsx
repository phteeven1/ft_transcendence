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
} from './_components/people-panel';
import RenameGroup from './_components/rename-group';
import LeaveGroup from './_components/leave-group';
import DeleteGroup from './_components/delete-group';
import PromoteToAdmin from './_components/promote-to-admin';
import ResignAdmin from './_components/resign-admin';
import ExpelMember from './_components/expel-member';
import RenamePlayer from './_components/rename-player';
import EditPassphrase from './_components/edit-passphrase';
import DeletePlayer from './_components/delete-player';
import InviteToPlay from './_components/invite-to-play';
import EndGameSession from './_components/end-game-session';
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
  const tGroup = useTranslations('group');
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

  const [promoteMember, setPromoteMember] = useState<Member | null>(null);
  const [expelMember, setExpelMember] = useState<Member | null>(null);
  const [resignOpen, setResignOpen] = useState(false);

  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [playerDialog, setPlayerDialog] = useState<PlayerAction | null>(null);

  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [isVocabLoading, setIsVocabLoading] = useState(false);

  const selectedGroupId = group?.id;
  const userId = user?.id;
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
    queueMicrotask(() => {
      void loadDashboard();
    });
  }, [userId, player, router, loadDashboard]);

  useEffect(() => {
    if (player || !user || group || !user.currentGroup) return;
    const restoreGroupId = user.currentGroup;
    void (async () => {
      const synced = await syncGroup(restoreGroupId);
      if (!synced) return;
      const isMember =
        synced.members.includes(user.id) || synced.admins.includes(user.id);
      if (!isMember) leaveGroup();
    })();
  }, [user, group, player, syncGroup, leaveGroup]);

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

  const closePlayerDialog = () => {
    setPlayerDialog(null);
    setActivePlayer(null);
  };

  const handlePlayerAction = (action: PlayerAction, target: Player) => {
    setActivePlayer(target);
    setPlayerDialog(action);
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

  const handleSelectVocabulary = (vocabulary: Vocabulary) => {
    void activateVocabulary(vocabulary);
  };

  const handleVocabularyImported = (vocabulary: Vocabulary) => {
    setVocabularies((prev) => [...prev, vocabulary]);
    void activateVocabulary(vocabulary);
  };

  const handleVocabularyRenamed = (updated: Vocabulary) => {
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

  const handleVocabularyEdited = (updated: Vocabulary) => {
    setVocabularies((prev) =>
      prev.map((v) => (v.id === updated.id ? updated : v)),
    );
  };

  if (!user || player) return null;

  const isAdmin = group ? group.admins.includes(user.id) : false;

  return (
    <PageShell wide>
      <p className="mb-6 text-muted-foreground text-center">
        {t('welcome', { name: user.name })}
      </p>

      <div className="flex flex-col md:grid md:grid-cols-5 gap-4 lg:gap-6">
        <div className="md:col-span-2 flex flex-col">
          <GroupsPanel
            groups={groups}
            selectedGroupId={selectedGroupId}
            currentUserId={user.id}
            onSelect={(groupId) => void handleGroupSelect(groupId)}
            onAction={handleGroupAction}
          />
        </div>

        <div className="md:col-span-3 flex flex-col gap-3">
          {group ? (
            <>
              <div className="text-center md:text-left">
                <h2 className="font-heading text-xl font-bold text-foreground">
                  {group.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isAdmin ? tGroup('roleAdmin') : tGroup('roleMember')}
                </p>
              </div>
              <PeoplePanel
                members={currentGroupMembers}
                players={players}
                isPlayersLoading={isPlayersLoading}
                isAdmin={isAdmin}
                currentUserId={user.id}
                hasActiveVocabulary={!!group.currentVocabulary}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onPromote={setPromoteMember}
                onExpel={setExpelMember}
                onResign={() => setResignOpen(true)}
                onPlayerAction={handlePlayerAction}
                onPlayerCreated={handlePlayerCreated}
                vocabularies={vocabularies}
                currentVocabulary={group.currentVocabulary}
                isVocabLoading={isVocabLoading}
                onSelectVocabulary={handleSelectVocabulary}
                onVocabularyImported={handleVocabularyImported}
                onVocabularyRenamed={handleVocabularyRenamed}
                onVocabularyEdited={handleVocabularyEdited}
                onVocabularyDeleted={handleVocabularyDeleted}
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
      <PromoteToAdmin
        member={promoteMember}
        open={promoteMember !== null}
        onClose={() => setPromoteMember(null)}
        syncAndRefresh={syncAndRefresh}
      />
      <ExpelMember
        member={expelMember}
        open={expelMember !== null}
        onClose={() => setExpelMember(null)}
        syncAndRefresh={syncAndRefresh}
      />
      <ResignAdmin
        open={resignOpen}
        onClose={() => setResignOpen(false)}
        syncAndRefresh={syncAndRefresh}
      />
      <RenamePlayer
        player={activePlayer}
        open={playerDialog === 'rename'}
        onClose={closePlayerDialog}
        onRenamed={handlePlayerUpdated}
      />
      <EditPassphrase
        player={activePlayer}
        open={playerDialog === 'passphrase'}
        onClose={closePlayerDialog}
        onUpdated={handlePlayerUpdated}
      />
      <DeletePlayer
        player={activePlayer}
        open={playerDialog === 'delete'}
        onClose={closePlayerDialog}
        onDeleted={handlePlayerDeleted}
      />
      <InviteToPlay
        player={activePlayer}
        open={playerDialog === 'invite'}
        onClose={closePlayerDialog}
      />
      <EndGameSession
        player={activePlayer}
        open={playerDialog === 'endSession'}
        onClose={closePlayerDialog}
        onCleared={handlePlayerUpdated}
      />
    </PageShell>
  );
}
