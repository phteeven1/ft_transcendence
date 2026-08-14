'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Dialog } from '../../components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  syncAndRefresh: () => Promise<void>;
};

export default function ResignAdmin({ open, onClose, syncAndRefresh }: Props) {
  const t = useTranslations('group');
  const tCommon = useTranslations('common');
  const { user, group } = useAuth();
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  if (!user || !group) return null;

  const isOnlyAdmin = group.admins.length === 1;

  const handleResign = async () => {
    if (isOnlyAdmin) {
      onClose();
      setResultMessage(t('resign.onlyAdminWarning'));
      setShowResult(true);
      return;
    }

    try {
      await groupsApi.demote({
        groupId: group.id,
        userId: user.id,
        authorId: user.id,
      });
      await syncAndRefresh();
      onClose();
      setResultMessage(t('resign.success', { groupName: group.name }));
      setShowResult(true);
    } catch (error) {
      console.error('Resign failed:', error);
      onClose();
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
      <Dialog
        open={open}
        onClose={onClose}
        title={t('resignAdmin')}
        confirmLabel={t('resignAdmin')}
        onConfirm={handleResign}
      >
        {t('resign.confirm', { groupName: group.name })}
      </Dialog>

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
