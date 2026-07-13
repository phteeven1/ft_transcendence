'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Button, Modal } from '../../components/ui';

type Props = {
  syncAndRefresh: () => Promise<void>;
};

export default function ResignAdmin({ syncAndRefresh }: Props) {
  const t = useTranslations('group');
  const { user, group } = useAuth();
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  if (!user || !group) return null;

  const isOnlyAdmin = group.admins.length === 1;

  const handleResign = async () => {
    if (isOnlyAdmin) {
      setResultMessage(t('resign.onlyAdminWarning'));
      setShowResult(true);
      return;
    }

    const confirmed = window.confirm(
      t('resign.confirm', { groupName: group.name }),
    );
    if (!confirmed) return;

    try {
      await groupsApi.demote({ groupId: group.id, userId: user.id, authorId: user.id });
      await syncAndRefresh();
      setResultMessage(t('resign.success', { groupName: group.name }));
      setShowResult(true);
    } catch (error) {
      console.error('Resign failed:', error);
      setResultMessage(t('resign.failed'));
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
        {t('resignAdmin')}
      </Button>

      <Modal open={showResult} onClose={handleCloseResult}>
        {resultMessage}
      </Modal>
    </>
  );
}
