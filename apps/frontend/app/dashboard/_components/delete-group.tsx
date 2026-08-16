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
  const [error, setError] = useState('');

  if (!user || !group) return null;

  const isOnlyAdmin =
    group.admins.includes(user.id) && group.admins.length === 1;

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleConfirm = async () => {
    setError('');
    try {
      await groupsApi.delete(group.id);
      if (currentGroup?.id === group.id) leaveGroup();
      handleClose();
      await onDone();
    } catch {
      setError(t('delete.failed'));
    }
  };

  if (!isOnlyAdmin) {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        onConfirm={handleClose}
        showCancel={false}
      >
        {t('delete.otherAdminsBlock', { groupName: group.name })}
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('delete.title', { groupName: group.name })}
      cancelLabel={tCommon('cancel')}
      confirmLabel={tCommon('delete')}
      onConfirm={handleConfirm}
      confirmVariant="destructive"
      cancelVariant="ghost"
    >
      <div className="space-y-3">
        <p>{t('delete.confirmMessage')}</p>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
    </Dialog>
  );
}
