'use client';
import { useState } from 'react';
import { useAuth } from '../../context/auth-context';
import { invitationsApi, ApiError } from '@/lib/api';
import { Button, Dialog, Input, Modal } from '../../components/ui';

const DEFAULT_INVITE_TEXT = (groupName: string) =>
  `Hi, I want to invite you to join the Dictée App, where your child can learn vocabulary lists in a fun and interactive way. Click the link below to join the learning group ${groupName} which I am also part of.`;

export default function SendInvite() {
  const { group, user } = useAuth();

  const [showModal, setShowModal] = useState(false);
  const [inviteText, setInviteText] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<
    'idle' | 'sending' | 'success' | 'error'
  >('idle');
  const [inviteError, setInviteError] = useState('');

  if (!group || !user) return null;

  const handleOpen = () => {
    setInviteText(DEFAULT_INVITE_TEXT(group.name));
    setInviteEmail('');
    setInviteStatus('idle');
    setInviteError('');
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setInviteStatus('idle');
    setInviteError('');
  };

  const handleSend = async () => {
    setInviteStatus('sending');
    setInviteError('');
    try {
      await invitationsApi.send({
        groupId: group.id,
        groupName: group.name,
        toEmail: inviteEmail,
        invitationText: inviteText,
        authorId: user.id,
      });
      setInviteStatus('success');
    } catch (error) {
      console.error('Failed to send invitation:', error);
      setInviteError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unknown error',
      );
      setInviteStatus('error');
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
        Send Invite
      </Button>

      {inviteStatus === 'success' ? (
        <Modal open={showModal} onClose={handleClose} confirmLabel="Close">
          <p className="text-primary font-medium">
            Invitation successfully sent to {inviteEmail}.
          </p>
        </Modal>
      ) : (
        <Dialog
          open={showModal}
          onClose={handleClose}
          title="Send Invitation"
          wide
          footer={
            <div className="flex gap-3 justify-end shrink-0 border-t border-border pt-4">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSend}
                disabled={inviteStatus === 'sending' || !inviteEmail}
              >
                {inviteStatus === 'sending' ? 'Sending...' : 'Submit'}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">
                Invitation
              </label>
              <textarea
                value={inviteText}
                onChange={(e) => setInviteText(e.target.value)}
                rows={6}
                className="clay-input w-full resize-y text-sm"
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="recipient@example.com"
            />

            {inviteStatus === 'error' && (
              <p className="text-destructive text-sm">
                Sending invitation failed: {inviteError}
              </p>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
