'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Group } from '../../types';
import { Dialog, Input } from '../../components/ui';

type Props = {
  group: Group | null;
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
};

export default function RenameGroup({
  group,
  open,
  onClose,
  onDone,
}: Props) {
  if (!group) return null;
  return (
    <RenameGroupForm
      key={`${group.id}-${String(open)}`}
      group={group}
      open={open}
      onClose={onClose}
      onDone={onDone}
    />
  );
}

function RenameGroupForm({
  group,
  open,
  onClose,
  onDone,
}: {
  group: Group;
  open: boolean;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const t = useTranslations('group');
  const tCommon = useTranslations('common');
  const { user, group: currentGroup, syncGroup } = useAuth();
  const [newName, setNewName] = useState(group.name);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleClose = () => {
    setNewName(group.name);
    setError('');
    onClose();
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    if (newName.trim() === group.name) {
      handleClose();
      return;
    }

    try {
      await groupsApi.rename({
        groupId: group.id,
        groupName: newName.trim(),
        authorId: user.id,
      });
      if (currentGroup?.id === group.id) {
        await syncGroup(group.id);
      }
      await onDone();
      handleClose();
    } catch (renameError) {
      console.error('Rename failed:', renameError);
      setError(t('rename.failed'));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('rename.title')}
      cancelLabel={tCommon('cancel')}
      confirmLabel={tCommon('rename')}
      onConfirm={handleRename}
      confirmVariant="primary"
      cancelVariant="ghost"
      confirmDisabled={!newName.trim()}
    >
      <div className="space-y-3">
        <Input
          label={t('rename.newNameLabel')}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('rename.newNamePlaceholder')}
          autoFocus
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
    </Dialog>
  );
}
