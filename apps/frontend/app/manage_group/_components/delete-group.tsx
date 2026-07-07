'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Button, Dialog, Modal } from '../../components/ui';

type Props = {
  syncAndRefresh: () => Promise<void>;
};

export default function DeleteGroup({ syncAndRefresh }: Props) {
  const { user, group, leaveGroup } = useAuth();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  // Guard. Returns null if no user or no group
  if (!user || !group) return null;

  // true if user is the only admin in the group
  const isOnlyAdmin =
    group.admins.includes(user.id) && group.admins.length === 1;

  // on clicking Delete Group. Checks conditional.
  const handleClick = () => {
    if (!isOnlyAdmin) {
      setResultMessage(
        `You cannot delete ${group.name} while there are other admins. ` +
          `Please demote all other admins first.`,
      );
      setShowResult(true);
      return;
    }
    setShowConfirm(true);
  };

  // deletes the group by POSTing delete to backend with groupId.
  const handleConfirm = async () => {
    try {
      await groupsApi.delete(group.id);
      leaveGroup();
      router.push('/dashboard');
    } catch (error) {
      console.error('deleteGroup failed:', error);
      setShowConfirm(false);
      setResultMessage('Something went wrong. Please try again.');
      setShowResult(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant="destructive"
        fullWidth
        className="clay-action-btn"
      >
        Delete Group
      </Button>

      <Dialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={`Delete ${group.name}?`}
        cancelLabel="Cancel"
        confirmLabel="Delete"
        onConfirm={handleConfirm}
        confirmVariant="destructive"
        cancelVariant="ghost"
      >
        This will permanently delete the group and all player profiles
        belonging to it. This cannot be undone.
      </Dialog>

      <Modal open={showResult} onClose={() => setShowResult(false)}>
        {resultMessage}
      </Modal>
    </>
  );
}
