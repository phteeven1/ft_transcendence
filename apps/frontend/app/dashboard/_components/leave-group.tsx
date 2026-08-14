'use client';

/* Leave-group confirmation flow, controlled by the parent `open` flag plus an
  internal ModalState for the four stages:
  1. confirmLeave: initial 'are you sure?'
  2. onlyAdmin: blocks leaving, tells user to promote someone else first
  3. confirmLastMember: warns that the group will be deleted if last member leaves
  4. error: shown if backend call fails.
*/
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Group } from '../../types';
import { Dialog } from '../../components/ui';

type ModalState =
  | 'none'
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
  const t = useTranslations('group');
  const tCommon = useTranslations('common');
  const { user, group: currentGroup, refreshUser, leaveGroup } = useAuth();
  const [modal, setModal] = useState<ModalState>('none');

  useEffect(() => {
    if (open) setModal('confirmLeave');
    else setModal('none');
  }, [open]);

  if (!user || !group) return null;

  const totalMembers = group.members.length + group.admins.length;
  const isOnlyAdmin =
    group.admins.includes(user.id) && group.admins.length === 1;
  const isLastMember = totalMembers === 1;

  const handleClose = () => {
    setModal('none');
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
        authorId: user.id,
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
