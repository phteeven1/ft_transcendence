'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../context/auth-context';
import { groupsApi, playersApi } from '@/lib/api';
import { Member, Player } from '../types';
import PeoplePanel, {
  PeopleTab,
  PlayerAction,
} from './_components/people-panel';
import BackToDashboard from './_components/back-to-dashboard';
import LeaveGroup from './_components/leave-group';
import PromoteToAdmin from './_components/promote-to-admin';
import ResignAdmin from './_components/resign-admin';
import RenameGroup from './_components/rename-group';
import ExpelMember from './_components/expel-member';
import DeleteGroup from './_components/delete-group';
import ManageVocabulary from './_components/manage-vocabulary';
import RenamePlayer from '../manage_players/_components/rename-player';
import EditPassphrase from '../manage_players/_components/edit-passphrase';
import DeletePlayer from '../manage_players/_components/delete-player';
import InviteToPlay from '../manage_players/_components/invite-to-play';
import EndGameSession from '../manage_players/_components/end-game-session';
import { PageShell } from '../components/ui';

function isPeopleTab(value: string | null): value is PeopleTab {
  return value === 'members' || value === 'players';
}

export default function ManageGroupPage() {
  return (
    <Suspense fallback={null}>
      <ManageGroup />
    </Suspense>
  );
}

function ManageGroup() {
  const t = useTranslations('group');
  const { user, group, player, syncGroup, leaveGroup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');

  const [currentGroupMembers, setCurrentGroupMembers] = useState<Member[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isPlayersLoading, setIsPlayersLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PeopleTab>(
    isPeopleTab(requestedTab) ? requestedTab : 'members',
  );

  const [promoteMember, setPromoteMember] = useState<Member | null>(null);
  const [expelMember, setExpelMember] = useState<Member | null>(null);
  const [resignOpen, setResignOpen] = useState(false);

  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [playerDialog, setPlayerDialog] = useState<PlayerAction | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!group) return;
    try {
      const members = await groupsApi.getMembers(group.id);
      setCurrentGroupMembers(members);
    } catch (error) {
      console.error('fetchMembers failed:', error);
    }
  }, [group]);

  const fetchPlayers = useCallback(async () => {
    if (!group) return;
    try {
      const data = await playersApi.findByGroup(group.id);
      setPlayers(data);
    } catch (error) {
      console.error('fetchPlayers failed:', error);
    } finally {
      setIsPlayersLoading(false);
    }
  }, [group]);

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

      await Promise.all([fetchMembers(), fetchPlayers()]);
    } catch (error) {
      console.error('syncAndRefresh failed:', error);
    }
  }, [group, user, syncGroup, leaveGroup, router, fetchMembers, fetchPlayers]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Parent just handed off to Play Now — InviteToPlay navigates to the lobby.
      if (player) return;

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
      fetchPlayers();
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [user, group, player, router, syncGroup, fetchMembers, fetchPlayers]);

  useEffect(() => {
    if (!group || !user) return;

    const interval = setInterval(() => {
      void syncAndRefresh();
    }, 5000);
    return () => clearInterval(interval);
  }, [group, user, syncAndRefresh]);

  const closePlayerDialog = () => {
    setPlayerDialog(null);
    setActivePlayer(null);
  };

  const handlePlayerAction = (action: PlayerAction, player: Player) => {
    setActivePlayer(player);
    setPlayerDialog(action);
  };

  const handlePlayerCreated = (player: Player) => {
    setPlayers((prev) => [...prev, player]);
  };

  const handlePlayerUpdated = (updated: Player) => {
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setActivePlayer(updated);
  };

  const handlePlayerDeleted = (playerId: number) => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    closePlayerDialog();
  };

  if (!user || !group) return null;

  const isAdmin = group.admins.includes(user.id);

  const buttons = (
    <>
      {isAdmin && <ManageVocabulary />}
      {isAdmin && <RenameGroup syncAndRefresh={syncAndRefresh} />}
      <LeaveGroup />
      {isAdmin && <DeleteGroup />}
      <BackToDashboard />
    </>
  );

  return (
    <PageShell>
      <div className="hidden md:block text-center mb-4 lg:mb-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {group.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? t('roleAdmin') : t('roleMember')}
        </p>
      </div>

      <div className="flex flex-col md:grid md:grid-cols-3 gap-4 lg:gap-6">
        <div className="md:col-span-2 flex flex-col">
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
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-1 gap-3 content-start">
          {buttons}
        </div>
      </div>

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
