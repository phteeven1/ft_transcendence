'use client';
/*
  Ask Admin button — visible to non-admins only.
  Allows a member to send a MEM message to all admins in the group.
  Message is limited to 300 characters.
*/
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { chatApi } from '@/lib/api/chat';
import { Button, Dialog } from '../../components/ui';

const MAX_CHARS = 300;

type Props = {
  syncAndRefresh: () => Promise<void>;
};

export default function MemberToAdmin({ syncAndRefresh }: Props) {
  const { group, user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage]     = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!group || !user) return null;

  const handleOpen = () => {
    setMessage('');
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setMessage('');
  };

  const handleConfirm = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    try {
      await chatApi.postMessage({
        groupId:  group.id,
        authorId: user.id,
        type:     'MEM',
        content:  message.trim(),
      });
      await syncAndRefresh();
      handleClose();
    } catch (error) {
      console.error('MemberToAdmin failed:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="accent"
        fullWidth
        className="clay-action-btn"
      >
        Ask Admin
      </Button>

      <Dialog
        open={showModal}
        onClose={handleClose}
        title="Message Admin"
        cancelLabel="Cancel"
        confirmLabel={isSending ? 'Sending…' : 'Confirm'}
        onConfirm={handleConfirm}
        confirmVariant="accent"
        cancelVariant="ghost"
        confirmDisabled={!message.trim() || isSending}
      >
        <p className="text-sm text-muted-foreground mb-4">
          Write a question or concern to the admins of group{' '}
          <span className="font-semibold text-foreground">{group.name}</span>.
          It will be visible in the Group Chat, but only to the admins of the group.
        </p>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
          rows={4}
          autoFocus
          placeholder="Your message…"
          className="clay-input w-full resize-none text-sm mb-1"
        />
        <p className="text-xs text-muted-foreground text-right">
          {message.length} / {MAX_CHARS}
        </p>
      </Dialog>
    </>
  );
}
