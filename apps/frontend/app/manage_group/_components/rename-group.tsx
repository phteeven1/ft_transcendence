'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Button, Dialog, Input, Modal } from '../../components/ui';

type Props = {
  syncAndRefresh: () => Promise<void>;
};

export default function RenameGroup({ syncAndRefresh }: Props) {
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
      setResultMessage('The group name was not changed.');
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
      setResultMessage(`Group successfully renamed to ${newName.trim()}.`);
      setShowResult(true);
    } catch (error) {
      console.error('Rename failed:', error);
      setShowModal(false);
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
        onClick={handleOpen}
        variant="primary"
        fullWidth
        className="clay-action-btn"
      >
        Rename Group
      </Button>

      <Dialog
        open={showModal}
        onClose={handleClose}
        title="Rename Group"
        cancelLabel="Cancel"
        confirmLabel="Rename"
        onConfirm={handleRename}
        confirmVariant="primary"
        cancelVariant="ghost"
        confirmDisabled={!newName.trim()}
      >
        <Input
          label="New Group Name"
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Enter new group name"
          autoFocus
        />
      </Dialog>

      <Modal open={showResult} onClose={handleCloseResult}>
        {resultMessage}
      </Modal>
    </>
  );
}
