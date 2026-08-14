'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Button, Dialog, Icon } from '../../components/ui';

export default function DeleteGroup() {
  const t = useTranslations('group');
  const tCommon = useTranslations('common');
  const { user, group, leaveGroup } = useAuth();
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  if (!user || !group) return null;

  const isOnlyAdmin =
    group.admins.includes(user.id) && group.admins.length === 1;

  const handleClick = () => {
    if (!isOnlyAdmin) {
      setResultMessage(t('delete.otherAdminsBlock', { groupName: group.name }));
      setShowResult(true);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    try {
      await groupsApi.delete(group.id);
      leaveGroup();
      router.push('/dashboard');
    } catch (error) {
      console.error('deleteGroup failed:', error);
      setShowConfirm(false);
      setResultMessage(t('delete.failed'));
      setShowResult(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant="destructive"
        fullWidth
        className="clay-action-btn"
      >
        <Icon name="trash" size={18} />
        {t('deleteGroup')}
      </Button>

      <Dialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={t('delete.title', { groupName: group.name })}
        cancelLabel={tCommon('cancel')}
        confirmLabel={tCommon('delete')}
        onConfirm={handleConfirm}
        confirmVariant="destructive"
        cancelVariant="ghost"
      >
        {t('delete.confirmMessage')}
      </Dialog>

      <Dialog
        open={showResult}
        onClose={() => setShowResult(false)}
        onConfirm={() => setShowResult(false)}
        showCancel={false}
      >
        {resultMessage}
      </Dialog>
    </>
  );
}
