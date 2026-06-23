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
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Button, Dialog, Modal } from '../../components/ui';

type ModalState =
  | 'none'
  | 'confirmLeave'
  | 'onlyAdmin'
  | 'confirmLastMember'
  | 'error';

export default function LeaveGroup() {
  const { user, group, refreshUser, leaveGroup } = useAuth();
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>('none');

  if (!user || !group) return null;

  const totalMembers = group.members.length + group.admins.length;
  const isOnlyAdmin =
    group.admins.includes(user.id) && group.admins.length === 1;
  const isLastMember = totalMembers === 1;

  // opens initial confirmation modal
  const handleClick = () => {
    setModal('confirmLeave');
  };

  // checks which scenario applies. If user is only admin, shows onlyAdmin modal.
  // if user is last member, shows confirmLastMember modal.
  // otherwise, calls executeLeave
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

  // POSTs to /groups/leave then refreshes the user in auth context
  // and clears the group from auth context via leaveGroup(), then navigates to /dashboard
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
        Leave Group
      </Button>

      <Dialog
        open={modal === 'confirmLeave'}
        onClose={() => setModal('none')}
        title="Leave Group?"
        cancelLabel="Cancel"
        confirmLabel="Leave"
        onConfirm={handleConfirmLeave}
        confirmVariant="primary"
        cancelVariant="ghost"
      >
        Are you sure you want to permanently leave {group.name}?
      </Dialog>

      <Modal
        open={modal === 'onlyAdmin'}
        onClose={() => setModal('none')}
      >
        You are the only admin of this group. Before leaving, you need to
        make another member admin.
      </Modal>

      <Dialog
        open={modal === 'confirmLastMember'}
        onClose={() => setModal('none')}
        title="Group will be deleted"
        cancelLabel="Cancel"
        confirmLabel="Leave"
        onConfirm={executeLeave}
        confirmVariant="primary"
        cancelVariant="ghost"
      >
        You are the last member of {group.name}. If you leave, the group
        will be permanently removed.
      </Dialog>

      <Modal
        open={modal === 'error'}
        onClose={() => setModal('none')}
      >
        Something went wrong. Please try again.
      </Modal>
    </>
  );
}
