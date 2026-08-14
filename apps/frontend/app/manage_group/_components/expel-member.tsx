'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { Member } from '../../types';
import { Dialog } from '../../components/ui';

type Props = {
  member: Member | null;
  open: boolean;
  onClose: () => void;
  syncAndRefresh: () => Promise<void>;
};

export default function ExpelMember({
  member,
  open,
  onClose,
  syncAndRefresh,
}: Props) {
  const t = useTranslations('group');
  const tCommon = useTranslations('common');
  const { group, user } = useAuth();
  const [resultMessage, setResultMessage] = useState('');
  const [showResult, setShowResult] = useState(false);

  if (!group || !user) return null;

  const handleConfirmExpel = async () => {
    if (!member) return;
    try {
      await groupsApi.expel({
        groupId: group.id,
        userId: member.id,
        authorId: user.id,
      });
      await syncAndRefresh();
      onClose();
      setResultMessage(
        t('expel.success', {
          memberName: member.name,
          groupName: group.name,
        }),
      );
      setShowResult(true);
    } catch (error) {
      console.error('Expel failed:', error);
      onClose();
      setResultMessage(t('expel.failed'));
      setShowResult(true);
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setResultMessage('');
  };

  return (
    <>
      {member && (
        <Dialog
          open={open}
          onClose={onClose}
          title={t('expel.confirmTitle')}
          confirmLabel={t('expel.expelButton')}
          onConfirm={handleConfirmExpel}
          confirmVariant="destructive"
        >
          {t('expel.confirmMessage', {
            memberName: member.name,
            groupName: group.name,
          })}
        </Dialog>
      )}

      <Dialog
        open={showResult}
        onClose={handleCloseResult}
        onConfirm={handleCloseResult}
        showCancel={false}
        confirmLabel={tCommon('ok')}
      >
        {resultMessage}
      </Dialog>
    </>
  );
}
