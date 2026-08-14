'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Member } from '../../types';
import { Dialog } from '../../components/ui';

export type MemberAction = 'promote' | 'expel' | 'resign';

type Props = {
  action: MemberAction | null;
  member: Member | null;
  open: boolean;
  onClose: () => void;
  syncAndRefresh: () => Promise<void>;
};

export default function MemberDialog({
  action,
  member,
  open,
  onClose,
  syncAndRefresh,
}: Props) {
  const t = useTranslations('group');
  const { group, user } = useAuth();
  const [error, setError] = useState('');

  if (!group || !user) return null;

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handlePromote = async () => {
    if (!member) return;
    setError('');
    try {
      await groupsApi.promote({
        groupId: group.id,
        userId: member.id,
      });
      await syncAndRefresh();
      handleClose();
    } catch (promoteError) {
      console.error('Promotion failed:', promoteError);
      setError(t('promote.failed'));
    }
  };

  const handleExpel = async () => {
    if (!member) return;
    setError('');
    try {
      await groupsApi.expel({
        groupId: group.id,
        userId: member.id,
      });
      await syncAndRefresh();
      handleClose();
    } catch (expelError) {
      console.error('Expel failed:', expelError);
      setError(t('expel.failed'));
    }
  };

  const handleResign = async () => {
    setError('');
    if (group.admins.length === 1) {
      setError(t('resign.onlyAdminWarning'));
      return;
    }
    try {
      await groupsApi.demote({
        groupId: group.id,
        userId: user.id,
      });
      await syncAndRefresh();
      handleClose();
    } catch (resignError) {
      console.error('Resign failed:', resignError);
      setError(t('resign.failed'));
    }
  };

  const confirm =
    action === 'promote' && member
      ? {
          title: t('promote.confirmTitle', { name: member.name }),
          label: t('promote.promoteButton'),
          message: t('promote.confirmMessage', {
            name: member.name,
            groupName: group.name,
          }),
          onConfirm: handlePromote,
          destructive: false,
        }
      : action === 'expel' && member
        ? {
            title: t('expel.confirmTitle'),
            label: t('expel.expelButton'),
            message: t('expel.confirmMessage', {
              memberName: member.name,
              groupName: group.name,
            }),
            onConfirm: handleExpel,
            destructive: true,
          }
        : action === 'resign'
          ? {
              title: t('resignAdmin'),
              label: t('resignAdmin'),
              message: t('resign.confirm', { groupName: group.name }),
              onConfirm: handleResign,
              destructive: false,
            }
          : null;

  if (!confirm) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={confirm.title}
      confirmLabel={confirm.label}
      onConfirm={confirm.onConfirm}
      confirmVariant={confirm.destructive ? 'destructive' : 'accent'}
    >
      <div className="space-y-3">
        <p>{confirm.message}</p>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
    </Dialog>
  );
}
