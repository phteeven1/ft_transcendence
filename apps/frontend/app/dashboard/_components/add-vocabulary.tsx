'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Vocabulary } from '../../types';
import { Button, Dialog, Icon } from '../../components/ui';
import ImportVocabulary from './import-vocabulary';

type Props = {
  onImported: (vocabulary: Vocabulary) => void;
};

export default function AddVocabulary({ onImported }: Props) {
  const t = useTranslations('vocabulary');
  const tCommon = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => setIsOpen(false);

  const handleImported = (vocabulary: Vocabulary) => {
    onImported(vocabulary);
    handleClose();
  };

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setIsOpen(true)}>
        <Icon name="book" size={16} />
        {t('addVocabulary')}
      </Button>

      <Dialog
        open={isOpen}
        onClose={handleClose}
        title={t('importTitle')}
        wide
        footer={
          <div className="flex justify-end border-t border-border pt-4">
            <Button variant="ghost" onClick={handleClose}>
              {tCommon('cancel')}
            </Button>
          </div>
        }
      >
        <ImportVocabulary onImported={handleImported} />
      </Dialog>
    </>
  );
}
