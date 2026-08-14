'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Group } from '../../types';
import { Panel } from '../../components/ui';
import RowMenu, { RowMenuItem } from './row-menu';
import ListRow from './list-row';
import NewListRow from './new-list-row';
import CreateGroup from './create-group';

export type GroupAction = 'rename' | 'leave' | 'delete';

type Props = {
  groups: Group[];
  selectedGroupId: number | undefined;
  currentUserId: number;
  onSelect: (groupId: number) => void;
  onAction: (action: GroupAction, group: Group) => void;
  onCreated: () => void;
};

export default function GroupsPanel({
  groups,
  selectedGroupId,
  currentUserId,
  onSelect,
  onAction,
  onCreated,
}: Props) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [createOpen, setCreateOpen] = useState(false);

  function groupMenuItems(group: Group): RowMenuItem[] {
    const isAdmin = group.admins.includes(currentUserId);
    const items: RowMenuItem[] = [];
    if (isAdmin) {
      items.push({
        id: 'rename',
        label: tCommon('rename'),
        icon: 'pencil',
        onSelect: () => onAction('rename', group),
      });
    }
    items.push({
      id: 'leave',
      label: tCommon('leave'),
      icon: 'sign-out',
      onSelect: () => onAction('leave', group),
    });
    if (isAdmin) {
      items.push({
        id: 'delete',
        label: tCommon('delete'),
        icon: 'trash',
        onSelect: () => onAction('delete', group),
      });
    }
    return items;
  }

  return (
    <Panel className="p-4 sm:p-5 flex flex-col">
      <h1 className="mb-4 font-heading text-lg font-semibold text-foreground">
        {t('title')}
      </h1>

      <ul className="list-none m-0 flex flex-col gap-1 p-0">
        {groups.map((group) => (
          <ListRow
            key={group.id}
            active={group.id === selectedGroupId}
            onSelect={() => onSelect(group.id)}
            menu={
              <RowMenu
                labelledBy={group.name}
                items={groupMenuItems(group)}
              />
            }
          >
            <span className="flex flex-col items-start">
              <span className="truncate">{group.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {group.admins.includes(currentUserId)
                  ? tCommon('admin')
                  : tCommon('member')}
              </span>
            </span>
          </ListRow>
        ))}
        <NewListRow
          label={t('newGroup')}
          onSelect={() => setCreateOpen(true)}
        />
      </ul>

      <CreateGroup
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onCreated}
      />
    </Panel>
  );
}
