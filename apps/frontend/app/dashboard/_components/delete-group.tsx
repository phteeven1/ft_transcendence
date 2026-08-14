'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Group } from '../../types';
import { Dialog } from '../../components/ui';

type Props = {
  group: Group | null;
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
};

export default function DeleteGroup({ group, open, onClose, onDone }: Props) {
  const t = useTranslations('group');
  const tCommon = useTranslations('common');
  const { user, group: currentGroup, leaveGroup } = useAuth();
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  if (!user) return null;

  const isOnlyAdmin = Boolean(
    group && group.admins.includes(user.id) && group.admins.length === 1,
  );

  const handleCloseResult = () => {
    setShowResult(false);
    setResultMessage('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!group) return;
    try {
      await groupsApi.delete(group.id);
      if (currentGroup?.id === group.id) leaveGroup();
      onClose();
      await onDone();
    } catch (error) {
      console.error('deleteGroup failed:', error);
      onClose();
      setResultMessage(t('delete.failed'));
      setShowResult(true);
    }
  };

  return (
    <>
      {group && (
        <Dialog
          open={open && isOnlyAdmin}
          onClose={onClose}
          title={t('delete.title', { groupName: group.name })}
          cancelLabel={tCommon('cancel')}
          confirmLabel={tCommon('delete')}
          onConfirm={handleConfirm}
          confirmVariant="destructive"
          cancelVariant="ghost"
        >
          {t('delete.confirmMessage')}
        </Dialog>
      )}

      {group && (
        <Dialog
          open={open && !isOnlyAdmin}
          onClose={onClose}
          onConfirm={onClose}
          showCancel={false}
        >
          {t('delete.otherAdminsBlock', { groupName: group.name })}
        </Dialog>
      )}

      <Dialog
        open={showResult}
        onClose={handleCloseResult}
        onConfirm={handleCloseResult}
        showCancel={false}
      >
        {resultMessage}
      </Dialog>
    </>
  );
}
