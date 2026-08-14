'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Group } from '../../types';
import { Dialog } from '../../components/ui';

type ModalState =
  | 'confirmLeave'
  | 'onlyAdmin'
  | 'confirmLastMember'
  | 'error';

type Props = {
  group: Group | null;
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
};

export default function LeaveGroup({ group, open, onClose, onDone }: Props) {
  if (!open || !group) return null;
  return (
    <LeaveGroupFlow
      key={group.id}
      group={group}
      onClose={onClose}
      onDone={onDone}
    />
  );
}

function LeaveGroupFlow({
  group,
  onClose,
  onDone,
}: {
  group: Group;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const t = useTranslations('group');
  const tCommon = useTranslations('common');
  const { user, group: currentGroup, refreshUser, leaveGroup } = useAuth();
  const [modal, setModal] = useState<ModalState>('confirmLeave');

  if (!user) return null;

  const totalMembers = group.members.length + group.admins.length;
  const isOnlyAdmin =
    group.admins.includes(user.id) && group.admins.length === 1;
  const isLastMember = totalMembers === 1;

  const handleClose = () => {
    onClose();
  };

  const handleConfirmLeave = () => {
    if (isOnlyAdmin && !isLastMember) {
      setModal('onlyAdmin');
      return;
    }
    if (isLastMember) {
      setModal('confirmLastMember');
      return;
    }
    void executeLeave();
  };

  const executeLeave = async () => {
    try {
      await groupsApi.leave({
        groupId: group.id,
        userId: user.id,
      });
      await refreshUser();
      if (currentGroup?.id === group.id) leaveGroup();
      handleClose();
      await onDone();
    } catch (error) {
      console.error('Failed to leave group:', error);
      setModal('error');
    }
  };

  return (
    <>
      <Dialog
        open={modal === 'confirmLeave'}
        onClose={handleClose}
        title={t('leave.confirmTitle')}
        cancelLabel={tCommon('cancel')}
        confirmLabel={tCommon('leave')}
        onConfirm={handleConfirmLeave}
        confirmVariant="primary"
        cancelVariant="ghost"
      >
        {t('leave.confirmMessage', { groupName: group.name })}
      </Dialog>

      <Dialog
        open={modal === 'onlyAdmin'}
        onClose={handleClose}
        onConfirm={handleClose}
        showCancel={false}
      >
        {t('leave.onlyAdminBlock')}
      </Dialog>

      <Dialog
        open={modal === 'confirmLastMember'}
        onClose={handleClose}
        title={t('leave.lastMemberTitle')}
        cancelLabel={tCommon('cancel')}
        confirmLabel={tCommon('leave')}
        onConfirm={() => void executeLeave()}
        confirmVariant="primary"
        cancelVariant="ghost"
      >
        {t('leave.lastMemberMessage', { groupName: group.name })}
      </Dialog>

      <Dialog
        open={modal === 'error'}
        onClose={handleClose}
        onConfirm={handleClose}
        showCancel={false}
      >
        {t('leave.failed')}
      </Dialog>
    </>
  );
}
