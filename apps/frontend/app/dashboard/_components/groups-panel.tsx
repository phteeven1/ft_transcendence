'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Group } from '../../types';
import { Panel, Button, Icon } from '../../components/ui';
import RowMenu, { RowMenuItem } from './row-menu';
import ListRow from './list-row';

export type GroupAction = 'rename' | 'leave' | 'delete';

type Props = {
  groups: Group[];
  selectedGroupId: number | undefined;
  currentUserId: number;
  onSelect: (groupId: number) => void;
  onAction: (action: GroupAction, group: Group) => void;
};

export default function GroupsPanel({
  groups,
  selectedGroupId,
  currentUserId,
  onSelect,
  onAction,
}: Props) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const router = useRouter();

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-lg font-semibold text-foreground">
          {t('title')}
        </h1>
        <Button
          variant="accent"
          size="sm"
          onClick={() => router.push('/create_group')}
        >
          <Icon name="users" size={16} />
          {t('createNewGroup')}
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground italic">
          {t('noGroups')}
        </p>
      ) : (
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
        </ul>
      )}
    </Panel>
  );
}
