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

export default function PromoteToAdmin({
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

  const handlePromote = async () => {
    if (!member) return;
    try {
      await groupsApi.promote({
        groupId: group.id,
        userId: member.id,
        authorId: user.id,
      });
      await syncAndRefresh();
      onClose();
      setResultMessage(
        t('promote.success', {
          name: member.name,
          groupName: group.name,
        }),
      );
      setShowResult(true);
    } catch (error) {
      console.error('Promotion failed:', error);
      onClose();
      setResultMessage(t('promote.failed'));
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
          title={t('promote.confirmTitle', { name: member.name })}
          confirmLabel={t('promote.promoteButton')}
          onConfirm={handlePromote}
        >
          {t('promote.confirmMessage', {
            name: member.name,
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
