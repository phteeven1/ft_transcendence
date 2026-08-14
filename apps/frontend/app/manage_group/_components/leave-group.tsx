'use client';

/* renders Leave Group button, that handles several scenarios before actually leaving
  all controlled by ModalState variable, that tells us where in the process we are at
  Pre rendering, it calculates the following: total member count, is current user the only admin, 
  and is current user the last member. The four stages are:
  1. confirmLeave: initial 'are you sure?'
  2. onlyAdmin: blocks leaving group, tells user to promote someone else to admin first
  3. confirmLastMamber: warns that the group will be deleted if last member leaves
  4. error: shown if backend call fails.
*/
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Button, Dialog, Icon } from '../../components/ui';

type ModalState =
  | 'none'
  | 'confirmLeave'
  | 'onlyAdmin'
  | 'confirmLastMember'
  | 'error';

export default function LeaveGroup() {
  const t = useTranslations('group');
  const tCommon = useTranslations('common');
  const { user, group, refreshUser, leaveGroup } = useAuth();
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>('none');

  if (!user || !group) return null;

  const totalMembers = group.members.length + group.admins.length;
  const isOnlyAdmin =
    group.admins.includes(user.id) && group.admins.length === 1;
  const isLastMember = totalMembers === 1;

  const handleClick = () => {
    setModal('confirmLeave');
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
    executeLeave();
  };

  const executeLeave = async () => {
    if (!user || !group) return;
    try {
      await groupsApi.leave({ groupId: group.id, userId: user.id, authorId: user.id });
      await refreshUser();
      leaveGroup();
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to leave group:', error);
      setModal('error');
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant="primary"
        fullWidth
        className="clay-action-btn"
      >
        <Icon name="sign-out" size={18} />
        {t('leaveGroup')}
      </Button>

      <Dialog
        open={modal === 'confirmLeave'}
        onClose={() => setModal('none')}
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
        onClose={() => setModal('none')}
        onConfirm={() => setModal('none')}
        showCancel={false}
      >
        {t('leave.onlyAdminBlock')}
      </Dialog>

      <Dialog
        open={modal === 'confirmLastMember'}
        onClose={() => setModal('none')}
        title={t('leave.lastMemberTitle')}
        cancelLabel={tCommon('cancel')}
        confirmLabel={tCommon('leave')}
        onConfirm={executeLeave}
        confirmVariant="primary"
        cancelVariant="ghost"
      >
        {t('leave.lastMemberMessage', { groupName: group.name })}
      </Dialog>

      <Dialog
        open={modal === 'error'}
        onClose={() => setModal('none')}
        onConfirm={() => setModal('none')}
        showCancel={false}
      >
        {t('leave.failed')}
      </Dialog>
    </>
  );
}
