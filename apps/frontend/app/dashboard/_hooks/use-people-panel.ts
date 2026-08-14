'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { groupsApi, playersApi, vocabulariesApi } from '@/lib/api';
import { Member, Player, Vocabulary } from '../../types';
import { TEST_VOCABULARY } from '../_components/test-vocabulary';
import type { MemberAction } from '../_components/member-dialog';
import type { VocabularyAction } from '../_components/vocabulary-list';
import { DASHBOARD_POLL_INTERVAL_MS } from './poll-interval';

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
    } catch (error) {
      console.error('fetchMembers failed:', error);
    }
  }, [selectedGroupId]);

  const fetchPlayers = useCallback(async (): Promise<void> => {
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

  const fetchVocabularies = useCallback(async (): Promise<void> => {
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
    } catch (error) {
      console.error('syncAndRefresh failed:', error);
    }
  }, [selectedGroupId, userId, syncGroup, leaveGroup, fetchMembers, fetchPlayers]);

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
    if (!userId || player) return;
    const interval = setInterval(() => {
      void syncAndRefresh();
    }, DASHBOARD_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId, player, syncAndRefresh]);

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
    },
    [group, user, syncGroup],
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
    if (group && vocabularyId === group.currentVocabulary) {
      void syncGroup(group.id);
    }
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
