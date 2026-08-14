'use client';
import { useEffect, useState } from 'react';
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
  const t = useTranslations('group');
  const tCommon = useTranslations('common');
  const { user, group: currentGroup, syncGroup } = useAuth();
  const [newName, setNewName] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  useEffect(() => {
    if (open && group) setNewName(group.name);
  }, [open, group]);

  if (!user) return null;

  const handleClose = () => {
    setNewName('');
    onClose();
  };

  const handleRename = async () => {
    if (!group || !newName.trim()) return;
    if (newName.trim() === group.name) {
      handleClose();
      setResultMessage(t('rename.unchanged'));
      setShowResult(true);
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
      setResultMessage(t('rename.success', { name: newName.trim() }));
      setShowResult(true);
    } catch (error) {
      console.error('Rename failed:', error);
      handleClose();
      setResultMessage(t('rename.failed'));
      setShowResult(true);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setResultMessage('');
  };

  return (
    <>
      {group && (
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
          <Input
            label={t('rename.newNameLabel')}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('rename.newNamePlaceholder')}
            autoFocus
          />
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
