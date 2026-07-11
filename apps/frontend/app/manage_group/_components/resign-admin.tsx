'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Button, Modal } from '../../components/ui';

type Props = {
  syncAndRefresh: () => Promise<void>;
};

export default function ResignAdmin({ syncAndRefresh }: Props) {
  const { user, group } = useAuth();
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  if (!user || !group) return null;

  const isOnlyAdmin = group.admins.length === 1;

  const handleResign = async () => {
    if (isOnlyAdmin) {
      setResultMessage(
        'You are the only admin of this group. Promote another member to admin before resigning.',
      );
      setShowResult(true);
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to resign as admin of ${group.name}? You will become a regular member.`,
    );
    if (!confirmed) return;

    try {
      await groupsApi.demote({ groupId: group.id, userId: user.id, authorId: user.id });
      await syncAndRefresh();
      setResultMessage(
        `You have successfully resigned as admin of ${group.name}. You are now a regular member.`,
      );
      setShowResult(true);
    } catch (error) {
      console.error('Resign failed:', error);
      setResultMessage('Something went wrong. Please try again.');
      setShowResult(true);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setResultMessage('');
  };

  return (
    <>
      <Button
        onClick={handleResign}
        variant="accent"
        fullWidth
        className="clay-action-btn"
      >
        Resign as Admin
      </Button>

      <Modal open={showResult} onClose={handleCloseResult}>
        {resultMessage}
      </Modal>
    </>
  );
}
