'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { invitationsApi } from '@/lib/api';
import { Button, Dialog, Input } from '../../components/ui';
import { Group } from '../../types';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SendInvite({ open, onClose }: Props) {
  const { group, user } = useAuth();
  if (!group || !user) return null;
  return (
    <SendInviteForm
      key={String(open)}
      group={group}
      open={open}
      onClose={onClose}
    />
  );
}

function SendInviteForm({
  group,
  open,
  onClose,
}: {
  group: Group;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('group');
  const tInvitation = useTranslations('invitation');
  const tCommon = useTranslations('common');

  const [inviteText, setInviteText] = useState(
    tInvitation('defaultInviteText', { groupName: group.name }),
  );
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'error'>(
    'idle',
  );
  const [inviteError, setInviteError] = useState('');

  const handleClose = () => {
    onClose();
  };

  const handleSend = async () => {
    setInviteStatus('sending');
    setInviteError('');
    try {
      const result = await invitationsApi.send({
        groupId: group.id,
        groupName: group.name,
        toEmail: inviteEmail,
        invitationText: inviteText,
      });
      if (!result.success) {
        setInviteError(result.message || tCommon('unknownError'));
        setInviteStatus('error');
        return;
      }
      handleClose();
    } catch {
      setInviteError(tCommon('unknownError'));
      setInviteStatus('error');
    }
  };

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
