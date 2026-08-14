'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Member, Player, Vocabulary } from '../../types';
import { Panel, Chip, Icon } from '../../components/ui';
import RowMenu, { RowMenuItem } from './row-menu';
import ListRow from './list-row';
import NewListRow from './new-list-row';
import SendInvite from './send-invite';
import CreatePlayer from './create-player';
import AddVocabulary from './add-vocabulary';
import VocabularyList, { VocabularyAction } from './vocabulary-list';
import type { MemberAction } from './member-dialog';

export type PeopleTab = 'members' | 'players' | 'vocabulary';
export type PlayerAction = 'rename' | 'delete';
export type { MemberAction, VocabularyAction };

type Props = {
  groupName: string;
  members: Member[];
  players: Player[];
  isPlayersLoading: boolean;
  isAdmin: boolean;
  currentUserId: number;
  hasActiveVocabulary: boolean;
  activeTab: PeopleTab;
  onTabChange: (tab: PeopleTab) => void;
  onMemberAction: (action: MemberAction, member?: Member) => void;
  onPlayerAction: (action: PlayerAction, player: Player) => void;
  onPlay: (player: Player) => void;
  onPlayerCreated: (player: Player) => void;
  vocabularies: Vocabulary[];
  currentVocabulary: number | undefined;
  isVocabLoading: boolean;
  onSelectVocabulary: (vocabulary: Vocabulary) => void;
  onVocabularyImported: (vocabulary: Vocabulary) => void;
  onVocabAction: (action: VocabularyAction, vocabulary: Vocabulary) => void;
};

export default function PeoplePanel({
  groupName,
  members,
  players,
  isPlayersLoading,
  isAdmin,
  currentUserId,
  hasActiveVocabulary,
  activeTab,
  onTabChange,
  onMemberAction,
  onPlayerAction,
  onPlay,
  onPlayerCreated,
  vocabularies,
  currentVocabulary,
  isVocabLoading,
  onSelectVocabulary,
  onVocabularyImported,
  onVocabAction,
}: Props) {
  const t = useTranslations('group');
  const tPlayers = useTranslations('players');
  const tCommon = useTranslations('common');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createPlayerOpen, setCreatePlayerOpen] = useState(false);
  const [addVocabularyOpen, setAddVocabularyOpen] = useState(false);

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aMine = a.ofUser === currentUserId;
      const bMine = b.ofUser === currentUserId;
      if (aMine !== bMine) return aMine ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [players, currentUserId]);

  function memberMenuItems(member: Member): RowMenuItem[] {
    if (!isAdmin) return [];

    if (member.id === currentUserId && member.isAdmin) {
      return [
        {
          id: 'resign',
          label: tCommon('resign'),
          icon: 'sign-out',
          onSelect: () => onMemberAction('resign'),
        },
      ];
    }

    if (member.isAdmin) return [];

    return [
      {
        id: 'promote',
        label: tCommon('promote'),
        icon: 'crown',
        onSelect: () => onMemberAction('promote', member),
      },
      {
        id: 'expel',
        label: tCommon('expel'),
        icon: 'trash',
        onSelect: () => onMemberAction('expel', member),
        destructive: true,
      },
    ];
  }

  function playerMenuItems(player: Player): RowMenuItem[] {
    if (player.ofUser !== currentUserId) return [];

    return [
      {
        id: 'rename',
        label: tCommon('rename'),
        icon: 'pencil',
        onSelect: () => onPlayerAction('rename', player),
      },
      {
        id: 'delete',
        label: tCommon('delete'),
        icon: 'trash',
        onSelect: () => onPlayerAction('delete', player),
      },
    ];
  }

  return (
    <Panel className="flex flex-col overflow-hidden p-4 sm:p-5 max-h-[32rem] md:max-h-none md:h-full">
      <h2 className="mb-4 font-heading text-lg font-semibold text-foreground">
        {groupName}
      </h2>
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="tablist"
        aria-label={t('tabs.members')}
      >
        <Chip
          active={activeTab === 'members'}
          onClick={() => onTabChange('members')}
          aria-selected={activeTab === 'members'}
          role="tab"
          className="inline-flex items-center gap-1.5"
        >
          <Icon name="users" size={16} />
          {t('tabs.members')}
        </Chip>
        <Chip
          active={activeTab === 'players'}
          onClick={() => onTabChange('players')}
          aria-selected={activeTab === 'players'}
          role="tab"
          className="inline-flex items-center gap-1.5"
        >
          <Icon name="user" size={16} />
          {t('tabs.players')}
        </Chip>
        {isAdmin && (
          <Chip
            active={activeTab === 'vocabulary'}
            onClick={() => onTabChange('vocabulary')}
            aria-selected={activeTab === 'vocabulary'}
            role="tab"
            className="inline-flex items-center gap-1.5"
          >
            <Icon name="book" size={16} />
            {t('tabs.vocabulary')}
          </Chip>
        )}
      </div>

      {activeTab === 'members' ? (
        <div
          role="tabpanel"
          id="members-panel"
          className="overflow-y-auto flex-1"
        >
          <ul className="list-none m-0 flex flex-col gap-1 p-0">
            {members.map((member) => (
              <ListRow
                key={member.id}
                menu={
                  <RowMenu
                    labelledBy={member.name}
                    items={memberMenuItems(member)}
                  />
                }
              >
                <div className="flex flex-col">
                  <span className="text-foreground truncate">
                    {member.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {member.isAdmin ? tCommon('admin') : tCommon('member')}
                    {member.id === currentUserId
                      ? ` · ${tCommon('you')}`
                      : ''}
                  </span>
                </div>
              </ListRow>
            ))}
            {isAdmin && (
              <NewListRow
                label={t('newMember')}
                onSelect={() => setInviteOpen(true)}
              />
            )}
          </ul>
        </div>
      ) : activeTab === 'players' ? (
        <div
          role="tabpanel"
          id="players-panel"
          className="overflow-y-auto flex-1"
        >
          {isPlayersLoading ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              {tCommon('loadingEllipsis')}
            </p>
          ) : (
            <ul className="list-none m-0 flex flex-col gap-1 p-0">
              {sortedPlayers.map((player) => {
                const isOwn = player.ofUser === currentUserId;
                const canPlay = isOwn && hasActiveVocabulary;
                return (
                  <ListRow
                    key={player.id}
                    onSelect={canPlay ? () => onPlay(player) : undefined}
                    hoverContent={
                      isOwn ? (
                        <>
                          <Icon name="play" size={16} />
                          {tPlayers('play')}
                        </>
                      ) : undefined
                    }
                    menu={
                      <RowMenu
                        labelledBy={player.name}
                        items={playerMenuItems(player)}
                      />
                    }
                  >
                    <span className="text-foreground truncate">
                      {player.name}
                    </span>
                  </ListRow>
                );
              })}
              <NewListRow
                label={tPlayers('newPlayer')}
                onSelect={() => setCreatePlayerOpen(true)}
              />
            </ul>
          )}
        </div>
      ) : (
        <div
          role="tabpanel"
          id="vocabulary-panel"
          className="overflow-y-auto flex-1"
        >
          <VocabularyList
            vocabularies={vocabularies}
            currentVocabulary={currentVocabulary}
            isLoading={isVocabLoading}
            onSelect={onSelectVocabulary}
            onAction={onVocabAction}
            onNew={() => setAddVocabularyOpen(true)}
          />
        </div>
      )}

      <SendInvite open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <CreatePlayer
        open={createPlayerOpen}
        onClose={() => setCreatePlayerOpen(false)}
        onCreated={onPlayerCreated}
      />
      <AddVocabulary
        open={addVocabularyOpen}
        onClose={() => setAddVocabularyOpen(false)}
        onImported={onVocabularyImported}
      />
    </Panel>
  );
}
