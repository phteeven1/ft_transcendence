'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Button, Dialog, Input, Icon } from '../../components/ui';

type Props = {
  syncAndRefresh: () => Promise<void>;
};

export default function RenameGroup({ syncAndRefresh }: Props) {
  const t = useTranslations('group');
  const tCommon = useTranslations('common');
  const { group, user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  if (!group || !user) return null;

  const handleOpen = () => {
    setNewName(group.name);
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setNewName('');
  };

  const handleRename = async () => {
    if (!newName.trim()) return;
    if (newName.trim() === group.name) {
      setShowModal(false);
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
      await syncAndRefresh();
      setShowModal(false);
      setResultMessage(t('rename.success', { name: newName.trim() }));
      setShowResult(true);
    } catch (error) {
      console.error('Rename failed:', error);
      setShowModal(false);
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
      <Button
        onClick={handleOpen}
        variant="primary"
        fullWidth
        className="clay-action-btn"
      >
        <Icon name="pencil" size={18} />
        {t('renameGroup')}
      </Button>

      <Dialog
        open={showModal}
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
