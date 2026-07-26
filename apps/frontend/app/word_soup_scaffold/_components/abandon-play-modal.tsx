'use client';

import { useTranslations } from 'next-intl';
import { Dialog } from '../../components/ui/dialog';

type Props = {
  onStay: () => void;
  onLeave: () => void;
  isLeaving: boolean;
};

export default function AbandonPlayModal({ onStay, onLeave, isLeaving }: Props) {
  const t = useTranslations('games.abandon');
  const tCommon = useTranslations('common');

  return (
    <Dialog
      open
      onClose={onStay}
      title={t('title')}
      cancelLabel={t('stayInGame')}
      confirmLabel={isLeaving ? tCommon('leaving') : t('leaveGame')}
      onConfirm={onLeave}
      confirmVariant="destructive"
      confirmDisabled={isLeaving}
    >
      <p className="leading-relaxed">{t('message')}</p>
    </Dialog>
  );
}
