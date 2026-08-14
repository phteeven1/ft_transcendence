'use client';
import { useTranslations } from 'next-intl';
import { vocabulariesApi } from '@/lib/api';
import { Vocabulary } from '../../types';
import { useAuth } from '../../context/auth-context';
import { Dialog } from '../../components/ui/dialog';

type Props = {
  vocabulary: Vocabulary | null;
  open: boolean;
  onClose: () => void;
  onDeleted: (vocabularyId: number) => void;
};

export default function DeleteVocabulary({
  vocabulary,
  open,
  onClose,
  onDeleted,
}: Props) {
  const t = useTranslations('vocabulary');
  const tCommon = useTranslations('common');
  const { group } = useAuth();

  const handleDelete = async () => {
    if (!vocabulary || !group) return;
    try {
      await vocabulariesApi.remove({
        vocabularyId: vocabulary.id,
        vocabularyInGroup: group.id,
      });
      onDeleted(vocabulary.id);
      onClose();
    } catch (error) {
      console.error('deleteVocabulary failed:', error);
    }
  };

  if (!vocabulary) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('delete.title', { name: vocabulary.name })}
      confirmLabel={tCommon('delete')}
      confirmVariant="destructive"
      onConfirm={handleDelete}
    >
      <p>{t('delete.confirmMessage')}</p>
    </Dialog>
  );
}
