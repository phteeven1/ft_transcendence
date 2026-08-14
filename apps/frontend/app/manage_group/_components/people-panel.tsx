'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Member, Player } from '../../types';
import { Panel, Tab, TabPanel, Tabs, Icon } from '../../components/ui';
import RowMenu, { RowMenuItem } from './row-menu';
import SendInvite from './send-invite';
import CreatePlayer from '../../manage_players/_components/create-player';

export type PeopleTab = 'members' | 'players';
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
          label: t('resignAdmin'),
          icon: 'sign-out',
          onSelect: onResign,
        },
      ];
    }

    if (member.isAdmin) return [];

    return [
      {
        id: 'promote',
        label: t('promoteToAdmin'),
        icon: 'crown',
        onSelect: () => onPromote(member),
      },
      {
        id: 'expel',
        label: t('expelMember'),
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
        label: tPlayers('inviteToPlay'),
        icon: 'play',
        onSelect: () => onPlayerAction('invite', player),
        disabled: !hasActiveVocabulary,
      },
      {
        id: 'endSession',
        label: tPlayers('endGameSession'),
        icon: 'stop',
        onSelect: () => onPlayerAction('endSession', player),
        disabled: !hasSession,
      },
      {
        id: 'rename',
        label: tPlayers('renamePlayer'),
        icon: 'pencil',
        onSelect: () => onPlayerAction('rename', player),
      },
      {
        id: 'passphrase',
        label: tPlayers('editPassphraseButton'),
        icon: 'key',
        onSelect: () => onPlayerAction('passphrase', player),
      },
      {
        id: 'delete',
        label: tPlayers('deletePlayer'),
        icon: 'trash',
        onSelect: () => onPlayerAction('delete', player),
        destructive: true,
      },
    ];
  }

  return (
    <Panel className="flex flex-col overflow-hidden max-h-[32rem] md:max-h-none md:h-full">
      <div className="flex items-end gap-2 clay-tabs">
        <Tabs className="flex-1 !border-b-0 !bg-transparent !p-0">
          <Tab
            id="members-tab"
            panelId="members-panel"
            active={activeTab === 'members'}
            onClick={() => onTabChange('members')}
            className="inline-flex items-center gap-1.5"
          >
            <Icon name="users" size={16} />
            {t('tabs.members')}
          </Tab>
          <Tab
            id="players-tab"
            panelId="players-panel"
            active={activeTab === 'players'}
            onClick={() => onTabChange('players')}
            className="inline-flex items-center gap-1.5"
          >
            <Icon name="user" size={16} />
            {t('tabs.players')}
          </Tab>
        </Tabs>
        <div className="shrink-0 pb-1 pr-1">
          {activeTab === 'members' && isAdmin && <SendInvite compact />}
          {activeTab === 'players' && (
            <CreatePlayer compact onCreated={onPlayerCreated} />
          )}
        </div>
      </div>

      <TabPanel
        panelId="members-panel"
        labelledBy="members-tab"
        hidden={activeTab !== 'members'}
        className="overflow-y-auto flex-1"
      >
        {members.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground italic">
            {t('noMembers')}
          </p>
        ) : (
          <ul className="list-none m-0 p-0">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border last:border-b-0"
              >
                <div className="min-w-0 flex flex-col">
                  <span className="text-foreground truncate">
                    {member.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {member.isAdmin ? tCommon('admin') : tCommon('member')}
                    {member.id === currentUserId ? ` · ${tCommon('you')}` : ''}
                  </span>
                </div>
                <RowMenu
                  labelledBy={member.name}
                  items={memberMenuItems(member)}
                />
              </li>
            ))}
          </ul>
        )}
      </TabPanel>

      <TabPanel
        panelId="players-panel"
        labelledBy="players-tab"
        hidden={activeTab !== 'players'}
        className="overflow-y-auto flex-1"
      >
        {isPlayersLoading ? (
          <p className="px-3 py-3 text-sm text-muted-foreground">
            {tCommon('loadingEllipsis')}
          </p>
        ) : players.length === 0 ? (
          <p className="px-3 py-3 text-sm text-muted-foreground italic">
            {tPlayers('noPlayers')}
          </p>
        ) : (
          <ul className="list-none m-0 p-0">
            {playerGroups.map((group) => (
              <li key={group.parentId}>
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted border-b border-border">
                  {group.isYou
                    ? t('ofParentYou', {
                        name: group.parentName,
                        you: tCommon('you'),
                      })
                    : t('ofParent', { name: group.parentName })}
                </p>
                <ul className="list-none m-0 p-0">
                  {group.players.map((player) => (
                    <li
                      key={player.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border last:border-b-0"
                    >
                      <span className="text-foreground truncate">
                        {player.name}
                      </span>
                      <RowMenu
                        labelledBy={player.name}
                        items={playerMenuItems(player)}
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </TabPanel>
    </Panel>
  );
}
