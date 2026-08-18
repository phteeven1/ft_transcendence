'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { groupsApi, playersApi, vocabulariesApi } from '@/lib/api';
import { Member, Player, Vocabulary } from '../../types';
import {
  isStarterVocabulary,
  TEST_VOCABULARY,
} from '../_components/test-vocabulary';
import type { MemberAction } from '../_components/member-dialog';
import type { VocabularyAction } from '../_components/vocabulary-list';
import { useDashboardSocket } from '../../hooks/use-dashboard-socket';

export type PeopleTab = 'members' | 'players' | 'vocabulary';
export type PlayerAction = 'rename' | 'delete';

export type UsePeoplePanelResult = {
  groupName: string;
  members: Member[];
  players: Player[];
  isPlayersLoading: boolean;
  isAdmin: boolean;
  currentUserId: number;
  hasActiveVocabulary: boolean;
  activeTab: PeopleTab;
  setActiveTab: (tab: PeopleTab) => void;
  vocabularies: Vocabulary[];
  currentVocabulary: number | undefined;
  isVocabLoading: boolean;
  activateVocabulary: (vocabulary: Vocabulary) => Promise<void>;
  handleMemberAction: (action: MemberAction, member?: Member) => void;
  handlePlayerAction: (action: PlayerAction, player: Player) => void;
  handlePlay: (player: Player) => void;
  handlePlayerCreated: (player: Player) => void;
  handleVocabularyImported: (vocabulary: Vocabulary) => void;
  handleVocabAction: (action: VocabularyAction, vocabulary: Vocabulary) => void;
  actionMember: Member | null;
  memberDialog: MemberAction | null;
  closeMemberDialog: () => void;
  syncAndRefresh: () => Promise<void>;
  activePlayer: Player | null;
  playerDialog: PlayerAction | null;
  isPlayOpen: boolean;
  closePlayerDialog: () => void;
  closePlay: () => void;
  handlePlayerUpdated: (updated: Player) => void;
  handlePlayerDeleted: (playerId: number) => void;
  actionVocabulary: Vocabulary | null;
  vocabDialog: VocabularyAction | null;
  closeVocabDialog: () => void;
  handleVocabularyUpdated: (updated: Vocabulary) => void;
  handleVocabularyDeleted: (vocabularyId: number) => void;
};

function isPeopleTab(value: string | null): value is PeopleTab {
  return value === 'members' || value === 'players' || value === 'vocabulary';
}

export function usePeoplePanel(): UsePeoplePanelResult {
  const { user, group, player, syncGroup, leaveGroup } = useAuth();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab');

  const [members, setMembers] = useState<Member[]>([]);
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
  const isAdmin = Boolean(
    userId && group && group.admins.includes(userId),
  );

  const fetchMembers = useCallback(async (): Promise<void> => {
    if (!selectedGroupId) return;
    try {
      const data = await groupsApi.getMembers(selectedGroupId);
      setMembers(data);
    } catch {
      /* keep last members */
    }
  }, [selectedGroupId]);

  const fetchPlayers = useCallback(async (): Promise<void> => {
    if (!selectedGroupId) return;
    try {
      const data = await playersApi.findByGroup(selectedGroupId);
      setPlayers(data);
    } catch {
      /* keep last players */
    } finally {
      setIsPlayersLoading(false);
    }
  }, [selectedGroupId]);

  const fetchVocabularies = useCallback(async (): Promise<void> => {
    if (!selectedGroupId || !userId) return;
    try {
      let data = await vocabulariesApi.findByGroup(selectedGroupId);

      let starter = data.find((vocabulary) =>
        isStarterVocabulary(vocabulary.name),
      );
      if (!starter) {
        starter = await vocabulariesApi.findOrCreate({
          vocabularyInGroup: selectedGroupId,
          byUser: userId,
          vocabularyName: TEST_VOCABULARY.name,
          vocabularyWords: TEST_VOCABULARY.words,
          vocabularyMeanings: TEST_VOCABULARY.meanings,
        });
        data = [...data, starter];
      }
      if (!starter) return;

      const custom = data.filter(
        (vocabulary) => !isStarterVocabulary(vocabulary.name),
      );
      setVocabularies(custom);
    } catch {
      /* keep last vocabularies */
    } finally {
      setIsVocabLoading(false);
    }
  }, [selectedGroupId, userId]);

  const syncAndRefresh = useCallback(async (): Promise<void> => {
    if (!selectedGroupId || !userId) return;
    try {
      const updatedGroup = await syncGroup(selectedGroupId);
      if (!updatedGroup) return;

      const isStillMember =
        updatedGroup.members.includes(userId) ||
        updatedGroup.admins.includes(userId);

      if (!isStillMember) {
        leaveGroup();
        return;
      }

      await Promise.all([fetchMembers(), fetchPlayers()]);
    } catch {
      /* keep last group snapshot */
    }
  }, [selectedGroupId, userId, syncGroup, leaveGroup, fetchMembers, fetchPlayers]);

  const refreshDashboard = useCallback((): void => {
    void syncAndRefresh();
    if (isAdmin) void fetchVocabularies();
  }, [syncAndRefresh, isAdmin, fetchVocabularies]);

  useDashboardSocket({
    userId: userId ?? 0,
    groupId: selectedGroupId ?? 0,
    enabled: Boolean(userId) && !player,
    onDashboardUpdate: refreshDashboard,
    onMembershipChanged: refreshDashboard,
  });

  useEffect(() => {
    if (!userId || player) return;
    const onVisible = (): void => {
      if (document.visibilityState !== 'visible') return;
      refreshDashboard();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [userId, player, refreshDashboard]);

  useEffect(() => {
    if (!selectedGroupId) {
      setMembers([]);
      setPlayers([]);
      setIsPlayersLoading(false);
      setVocabularies([]);
      setIsVocabLoading(false);
      return;
    }
    setIsPlayersLoading(true);
    void fetchMembers();
    void fetchPlayers();
    if (isAdmin) {
      setIsVocabLoading(true);
      void fetchVocabularies();
    } else {
      setVocabularies([]);
      setIsVocabLoading(false);
    }
  }, [selectedGroupId, isAdmin, fetchMembers, fetchPlayers, fetchVocabularies]);

  useEffect(() => {
    if (activeTab === 'vocabulary' && user && group && !group.admins.includes(user.id)) {
      setActiveTab('members');
    }
  }, [activeTab, user, group]);

  const closeMemberDialog = (): void => {
    setMemberDialog(null);
    setActionMember(null);
  };

  const handleMemberAction = (
    action: MemberAction,
    member?: Member,
  ): void => {
    setActionMember(member ?? null);
    setMemberDialog(action);
  };

  const closePlayerDialog = (): void => {
    setPlayerDialog(null);
    setActivePlayer(null);
  };

  const handlePlayerAction = (action: PlayerAction, target: Player): void => {
    setActivePlayer(target);
    setPlayerDialog(action);
  };

  const handlePlay = (target: Player): void => {
    setActivePlayer(target);
    setIsPlayOpen(true);
  };

  const closePlay = (): void => {
    setIsPlayOpen(false);
    if (playerDialog === null) setActivePlayer(null);
  };

  const handlePlayerCreated = (created: Player): void => {
    setPlayers((prev) => [...prev, created]);
  };

  const handlePlayerUpdated = (updated: Player): void => {
    setPlayers((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setActivePlayer(updated);
  };

  const handlePlayerDeleted = (playerId: number): void => {
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    closePlayerDialog();
  };

  const activateVocabulary = useCallback(
    async (vocabulary: Vocabulary): Promise<void> => {
      if (!group) return;
      if (vocabulary.id === group.currentVocabulary) return;
      try {
        const updated = await vocabulariesApi.setActive({
          vocabularyId: vocabulary.id,
          vocabularyInGroup: group.id,
        });
        if (!updated) return;
        await syncGroup(group.id);
      } catch {
        /* selection stays on the previous list */
      }
    },
    [group, syncGroup],
  );

  const closeVocabDialog = (): void => {
    setVocabDialog(null);
    setActionVocabulary(null);
  };

  const handleVocabAction = (
    action: VocabularyAction,
    target: Vocabulary,
  ): void => {
    setActionVocabulary(target);
    setVocabDialog(action);
  };

  const handleVocabularyImported = (vocabulary: Vocabulary): void => {
    setVocabularies((prev) => [...prev, vocabulary]);
    void activateVocabulary(vocabulary);
  };

  const handleVocabularyUpdated = (updated: Vocabulary): void => {
    setVocabularies((prev) =>
      prev.map((v) => (v.id === updated.id ? updated : v)),
    );
  };

  const handleVocabularyDeleted = (vocabularyId: number): void => {
    setVocabularies((prev) => prev.filter((v) => v.id !== vocabularyId));
    void (async () => {
      if (group) await syncGroup(group.id);
      await fetchVocabularies();
    })();
  };

  return {
    groupName: group?.name ?? '',
    members,
    players,
    isPlayersLoading,
    isAdmin,
    currentUserId: userId ?? 0,
    hasActiveVocabulary: Boolean(group?.currentVocabulary),
    activeTab,
    setActiveTab,
    vocabularies,
    currentVocabulary: group?.currentVocabulary,
    isVocabLoading,
    activateVocabulary,
    handleMemberAction,
    handlePlayerAction,
    handlePlay,
    handlePlayerCreated,
    handleVocabularyImported,
    handleVocabAction,
    actionMember,
    memberDialog,
    closeMemberDialog,
    syncAndRefresh,
    activePlayer,
    playerDialog,
    isPlayOpen,
    closePlayerDialog,
    closePlay,
    handlePlayerUpdated,
    handlePlayerDeleted,
    actionVocabulary,
    vocabDialog,
    closeVocabDialog,
    handleVocabularyUpdated,
    handleVocabularyDeleted,
  };
}
