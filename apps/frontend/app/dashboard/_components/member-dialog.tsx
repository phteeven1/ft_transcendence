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
  const tCommon = useTranslations('common');
  const { group, user } = useAuth();
  const [resultMessage, setResultMessage] = useState('');
  const [showResult, setShowResult] = useState(false);

  if (!group || !user) return null;

  const handleCloseResult = () => {
    setShowResult(false);
    setResultMessage('');
  };

  const showResultMessage = (message: string) => {
    onClose();
    setResultMessage(message);
    setShowResult(true);
  };

  const handlePromote = async () => {
    if (!member) return;
    try {
      await groupsApi.promote({
        groupId: group.id,
        userId: member.id,
        authorId: user.id,
      });
      await syncAndRefresh();
      showResultMessage(
        t('promote.success', { name: member.name, groupName: group.name }),
      );
    } catch (error) {
      console.error('Promotion failed:', error);
      showResultMessage(t('promote.failed'));
    }
  };

  const handleExpel = async () => {
    if (!member) return;
    try {
      await groupsApi.expel({
        groupId: group.id,
        userId: member.id,
        authorId: user.id,
      });
      await syncAndRefresh();
      showResultMessage(
        t('expel.success', {
          memberName: member.name,
          groupName: group.name,
        }),
      );
    } catch (error) {
      console.error('Expel failed:', error);
      showResultMessage(t('expel.failed'));
    }
  };

  const handleResign = async () => {
    if (group.admins.length === 1) {
      showResultMessage(t('resign.onlyAdminWarning'));
      return;
    }
    try {
      await groupsApi.demote({
        groupId: group.id,
        userId: user.id,
        authorId: user.id,
      });
      await syncAndRefresh();
      showResultMessage(t('resign.success', { groupName: group.name }));
    } catch (error) {
      console.error('Resign failed:', error);
      showResultMessage(t('resign.failed'));
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

  return (
    <>
      {confirm && (
        <Dialog
          open={open}
          onClose={onClose}
          title={confirm.title}
          confirmLabel={confirm.label}
          onConfirm={confirm.onConfirm}
          confirmVariant={confirm.destructive ? 'destructive' : 'accent'}
        >
          {confirm.message}
        </Dialog>
      )}

      <Dialog
        open={showResult}
        onClose={handleCloseResult}
        onConfirm={handleCloseResult}
        showCancel={false}
        confirmLabel={tCommon('ok')}
      >
        {resultMessage}
      </Dialog>
    </>
  );
}
