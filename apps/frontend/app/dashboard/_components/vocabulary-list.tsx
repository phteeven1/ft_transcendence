'use client';
import { useTranslations } from 'next-intl';
import { Vocabulary } from '../../types';
import RowMenu, { RowMenuItem } from './row-menu';
import { ListRow, NewListRow } from '../../components/ui';

export type VocabularyAction = 'edit' | 'delete';

type Props = {
  vocabularies: Vocabulary[];
  currentVocabulary: number | undefined;
  isLoading: boolean;
  onSelect: (vocabulary: Vocabulary) => void;
  onAction: (action: VocabularyAction, vocabulary: Vocabulary) => void;
  onNew: () => void;
};

export default function VocabularyList({
  vocabularies,
  currentVocabulary,
  isLoading,
  onSelect,
  onAction,
  onNew,
}: Props) {
  const t = useTranslations('vocabulary');
  const tCommon = useTranslations('common');

  function menuItems(vocabulary: Vocabulary): RowMenuItem[] {
    return [
      {
        id: 'edit',
        label: tCommon('edit'),
        icon: 'book',
        onSelect: () => onAction('edit', vocabulary),
      },
      {
        id: 'delete',
        label: tCommon('delete'),
        icon: 'trash',
        onSelect: () => onAction('delete', vocabulary),
      },
    ];
  }

  if (isLoading) {
    return (
      <p className="px-3 py-3 text-sm text-muted-foreground">
        {tCommon('loadingEllipsis')}
      </p>
    );
  }

  return (
    <ul className="list-none m-0 flex flex-col gap-1 p-0">
      {vocabularies.map((vocabulary) => (
        <ListRow
          key={vocabulary.id}
          active={vocabulary.id === currentVocabulary}
          onSelect={() => onSelect(vocabulary)}
          menu={
            <RowMenu
              labelledBy={vocabulary.name}
              items={menuItems(vocabulary)}
            />
          }
        >
          <span className="min-w-0 truncate">{vocabulary.name}</span>
        </ListRow>
      ))}
      <NewListRow label={t('newVocabulary')} onSelect={onNew} />
    </ul>
  );
}
