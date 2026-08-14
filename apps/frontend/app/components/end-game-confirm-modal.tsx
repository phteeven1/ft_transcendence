'use client';

import { useTranslations } from 'next-intl';
import { Dialog } from './ui/dialog';

type Props = {
  onCancel: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
};

/**
 * Shared confirm dialog for ending an active game before it finishes naturally.
 */
export default function EndGameConfirmModal({
  onCancel,
  onConfirm,
  isConfirming,
}: Props) {
  const t = useTranslations('games.endGame');
  const tCommon = useTranslations('common');

  return (
    <Dialog
      open
      onClose={onCancel}
      title={t('title')}
      cancelLabel={t('cancel')}
      confirmLabel={isConfirming ? tCommon('ending') : t('confirm')}
      onConfirm={onConfirm}
      confirmVariant="destructive"
      confirmDisabled={isConfirming}
    >
      <p className="leading-relaxed">{t('message')}</p>
    </Dialog>
  );
}
