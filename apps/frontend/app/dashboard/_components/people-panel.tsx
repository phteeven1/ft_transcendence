'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Member, Player, Vocabulary } from '../../types';
import { Panel, Chip, Icon } from '../../components/ui';
import RowMenu, { RowMenuItem } from './row-menu';
import ListRow from './list-row';
import SendInvite from './send-invite';
import CreatePlayer from './create-player';
import AddVocabulary from './add-vocabulary';
import VocabularyPanel from './vocabulary-panel';

export type PeopleTab = 'members' | 'players' | 'vocabulary';
export type PlayerAction =
  'invite' | 'endSession' | 'rename' | 'passphrase' | 'delete';

type Props = {
  members: Member[];
  players: Player[];
  isPlayersLoading: boolean;
  isAdmin: boolean;
  currentUserId: number;
  hasActiveVocabulary: boolean;
  activeTab: PeopleTab;
  onTabChange: (tab: PeopleTab) => void;
  onPromote: (member: Member) => void;
  onExpel: (member: Member) => void;
  onResign: () => void;
  onPlayerAction: (action: PlayerAction, player: Player) => void;
  onPlayerCreated: (player: Player) => void;
  vocabularies: Vocabulary[];
  currentVocabulary: number | undefined;
  isVocabLoading: boolean;
  onSelectVocabulary: (vocabulary: Vocabulary) => void;
  onVocabularyImported: (vocabulary: Vocabulary) => void;
  onVocabularyRenamed: (vocabulary: Vocabulary) => void;
  onVocabularyEdited: (vocabulary: Vocabulary) => void;
  onVocabularyDeleted: (vocabularyId: number) => void;
};

type PlayerParentGroup = {
  parentId: number;
  parentName: string;
  isYou: boolean;
  players: Player[];
};

function groupPlayersByParent(
  players: Player[],
  members: Member[],
  currentUserId: number,
): PlayerParentGroup[] {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const byParent = new Map<number, Player[]>();

  for (const player of players) {
    const list = byParent.get(player.ofUser) ?? [];
    list.push(player);
    byParent.set(player.ofUser, list);
  }

  const groups = [...byParent.entries()].map(([parentId, grouped]) => {
    const member = memberById.get(parentId);
    return {
      parentId,
      parentName: member?.name ?? String(parentId),
      isYou: parentId === currentUserId,
      players: [...grouped].sort((a, b) => a.name.localeCompare(b.name)),
    };
  });

  groups.sort((a, b) => {
    if (a.isYou !== b.isYou) return a.isYou ? -1 : 1;
    return a.parentName.localeCompare(b.parentName);
  });

  return groups;
}

export default function PeoplePanel({
  members,
  players,
  isPlayersLoading,
  isAdmin,
  currentUserId,
  hasActiveVocabulary,
  activeTab,
  onTabChange,
  onPromote,
  onExpel,
  onResign,
  onPlayerAction,
  onPlayerCreated,
  vocabularies,
  currentVocabulary,
  isVocabLoading,
  onSelectVocabulary,
  onVocabularyImported,
  onVocabularyRenamed,
  onVocabularyEdited,
  onVocabularyDeleted,
}: Props) {
  const t = useTranslations('group');
  const tPlayers = useTranslations('players');
  const tCommon = useTranslations('common');

  const playerGroups = useMemo(
    () => groupPlayersByParent(players, members, currentUserId),
    [players, members, currentUserId],
  );

  function memberMenuItems(member: Member): RowMenuItem[] {
    if (!isAdmin) return [];

    if (member.id === currentUserId && member.isAdmin) {
      return [
        {
          id: 'resign',
          label: tCommon('resign'),
          icon: 'sign-out',
          onSelect: onResign,
        },
      ];
    }

    if (member.isAdmin) return [];

    return [
      {
        id: 'promote',
        label: tCommon('promote'),
        icon: 'crown',
        onSelect: () => onPromote(member),
      },
      {
        id: 'expel',
        label: tCommon('expel'),
        icon: 'trash',
        onSelect: () => onExpel(member),
        destructive: true,
      },
    ];
  }

  function playerMenuItems(player: Player): RowMenuItem[] {
    if (player.ofUser !== currentUserId) return [];

    const hasSession =
      player.sessionExpiresAt !== null || player.currentGameId !== null;

    return [
      {
        id: 'invite',
        label: tCommon('invite'),
        icon: 'play',
        onSelect: () => onPlayerAction('invite', player),
        disabled: !hasActiveVocabulary,
      },
      {
        id: 'endSession',
        label: tCommon('endSession'),
        icon: 'stop',
        onSelect: () => onPlayerAction('endSession', player),
        disabled: !hasSession,
      },
      {
        id: 'rename',
        label: tCommon('rename'),
        icon: 'pencil',
        onSelect: () => onPlayerAction('rename', player),
      },
      {
        id: 'passphrase',
        label: tCommon('passphrase'),
        icon: 'key',
        onSelect: () => onPlayerAction('passphrase', player),
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2" role="tablist" aria-label={t('tabs.members')}>
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
        <div className="shrink-0">
          {activeTab === 'members' && isAdmin && <SendInvite />}
          {activeTab === 'players' && (
            <CreatePlayer onCreated={onPlayerCreated} />
          )}
          {activeTab === 'vocabulary' && isAdmin && (
            <AddVocabulary onImported={onVocabularyImported} />
          )}
        </div>
      </div>

      {activeTab === 'members' ? (
        <div
          role="tabpanel"
          id="members-panel"
          className="overflow-y-auto flex-1"
        >
          {members.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground italic">
              {t('noMembers')}
            </p>
          ) : (
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
            </ul>
          )}
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
          ) : players.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground italic">
              {tPlayers('noPlayers')}
            </p>
          ) : (
            <ul className="list-none m-0 flex flex-col gap-3 p-0">
              {playerGroups.map((group) => (
                <li key={group.parentId}>
                  <p className="mb-1 px-3 text-xs font-semibold text-muted-foreground">
                    {group.isYou
                      ? t('ofParentYou', {
                          name: group.parentName,
                          you: tCommon('you'),
                        })
                      : t('ofParent', { name: group.parentName })}
                  </p>
                  <ul className="list-none m-0 flex flex-col gap-1 p-0">
                    {group.players.map((player) => (
                      <ListRow
                        key={player.id}
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
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <VocabularyPanel
          vocabularies={vocabularies}
          currentVocabulary={currentVocabulary}
          isLoading={isVocabLoading}
          onSelect={onSelectVocabulary}
          onRenamed={onVocabularyRenamed}
          onEdited={onVocabularyEdited}
          onDeleted={onVocabularyDeleted}
        />
      )}
    </Panel>
  );
}
