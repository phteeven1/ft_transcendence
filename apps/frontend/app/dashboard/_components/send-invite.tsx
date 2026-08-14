'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { invitationsApi, ApiError } from '@/lib/api';
import { Button, Dialog, Input } from '../../components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SendInvite({ open, onClose }: Props) {
  const t = useTranslations('group');
  const tInvitation = useTranslations('invitation');
  const tCommon = useTranslations('common');
  const { group, user } = useAuth();

  const [inviteText, setInviteText] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<
    'idle' | 'sending' | 'success' | 'error'
  >('idle');
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    if (!open || !group) return;
    setInviteText(tInvitation('defaultInviteText', { groupName: group.name }));
    setInviteEmail('');
    setInviteStatus('idle');
    setInviteError('');
  }, [open, group, tInvitation]);

  if (!group || !user) return null;

  const handleClose = () => {
    setInviteStatus('idle');
    setInviteError('');
    onClose();
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
            : tCommon('unknownError'),
      );
      setInviteStatus('error');
    }
  };

  if (inviteStatus === 'success') {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        onConfirm={handleClose}
        showCancel={false}
        confirmLabel={tCommon('close')}
      >
        <p className="text-primary font-medium">
          {t('sendInviteModal.success', { email: inviteEmail })}
        </p>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={t('sendInviteModal.title')}
      wide
      footer={
        <div className="flex gap-3 justify-end shrink-0 border-t border-border pt-4">
          <Button variant="ghost" onClick={handleClose}>
            {tCommon('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={inviteStatus === 'sending' || !inviteEmail}
          >
            {inviteStatus === 'sending'
              ? tCommon('sendingEllipsis')
              : tCommon('submit')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">
            {t('sendInviteModal.invitationLabel')}
          </label>
          <textarea
            value={inviteText}
            onChange={(e) => setInviteText(e.target.value)}
            rows={6}
            className="clay-input w-full resize-y text-sm"
          />
        </div>
        <Input
          label={tCommon('email')}
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder={t('sendInviteModal.emailPlaceholder')}
        />

        {inviteStatus === 'error' && (
          <p className="text-destructive text-sm">
            {t('sendInviteModal.failedPrefix')} {inviteError}
          </p>
        )}
      </div>
    </Dialog>
  );
}
