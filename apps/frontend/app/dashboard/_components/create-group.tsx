'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Dialog } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateGroup({ open, onClose, onCreated }: Props) {
  const t = useTranslations('dashboard.createGroup');
  const tCommon = useTranslations('common');
  const { user, syncGroup } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setGroupName('');
    setError('');
    onClose();
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!groupName.trim()) return;
    try {
      const data = await groupsApi.create({
        groupName: groupName.trim(),
        creatorId: user.id,
      });
      const result = await syncGroup(data.id);
      if (!result) {
        setError(t('failed'));
        return;
      }
      onCreated();
      handleClose();
    } catch {
      setError(t('failed'));
    }
  };

  const canCreate = groupName.trim() !== '';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('title')}
      confirmLabel={tCommon('create')}
      onConfirm={handleCreate}
      confirmDisabled={!canCreate}
    >
      <div className="space-y-4">
        <Input
          label={t('groupNameLabel')}
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder={t('groupNamePlaceholder')}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </Dialog>
  );
}
