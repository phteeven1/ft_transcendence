'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Group } from '../../types';
import { Panel } from '../../components/ui';
import RowMenu, { RowMenuItem } from './row-menu';
import ListRow from './list-row';
import NewListRow from './new-list-row';
import CreateGroup from './create-group';
import RenameGroup from './rename-group';
import LeaveGroup from './leave-group';
import DeleteGroup from './delete-group';
import { useGroupsPanel } from '../_hooks/use-groups-panel';

export default function GroupsPanel() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [createOpen, setCreateOpen] = useState(false);
  const {
    groups,
    selectedGroupId,
    currentUserId,
    loadGroups,
    selectGroup,
    actionGroup,
    groupDialog,
    handleAction,
    closeDialog,
  } = useGroupsPanel();

  function groupMenuItems(group: Group): RowMenuItem[] {
    const isAdmin = group.admins.includes(currentUserId);
    const items: RowMenuItem[] = [];
    if (isAdmin) {
      items.push({
        id: 'rename',
        label: tCommon('rename'),
        icon: 'pencil',
        onSelect: () => handleAction('rename', group),
      });
    }
    items.push({
      id: 'leave',
      label: tCommon('leave'),
      icon: 'sign-out',
      onSelect: () => handleAction('leave', group),
    });
    if (isAdmin) {
      items.push({
        id: 'delete',
        label: tCommon('delete'),
        icon: 'trash',
        onSelect: () => handleAction('delete', group),
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
            onSelect={() => void selectGroup(group.id)}
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
        onCreated={loadGroups}
      />
      <RenameGroup
        group={actionGroup}
        open={groupDialog === 'rename'}
        onClose={closeDialog}
        onDone={loadGroups}
      />
      <LeaveGroup
        group={actionGroup}
        open={groupDialog === 'leave'}
        onClose={closeDialog}
        onDone={loadGroups}
      />
      <DeleteGroup
        group={actionGroup}
        open={groupDialog === 'delete'}
        onClose={closeDialog}
        onDone={loadGroups}
      />
    </Panel>
  );
}
