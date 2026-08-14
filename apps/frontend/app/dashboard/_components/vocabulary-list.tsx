'use client';
import { useTranslations } from 'next-intl';
import { Vocabulary } from '../../types';
import RowMenu, { RowMenuItem } from './row-menu';
import ListRow from './list-row';

export type VocabularyAction = 'rename' | 'edit' | 'delete';

type Props = {
  vocabularies: Vocabulary[];
  currentVocabulary: number | undefined;
  isLoading: boolean;
  onSelect: (vocabulary: Vocabulary) => void;
  onAction: (action: VocabularyAction, vocabulary: Vocabulary) => void;
};

export default function VocabularyList({
  vocabularies,
  currentVocabulary,
  isLoading,
  onSelect,
  onAction,
}: Props) {
  const t = useTranslations('vocabulary');
  const tCommon = useTranslations('common');

  if (isLoading) {
    return (
      <p className="px-3 py-3 text-sm text-muted-foreground">
        {tCommon('loadingEllipsis')}
      </p>
    );
  }
  if (vocabularies.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground italic">
        {t('noVocabularies')}
      </p>
    );
  }

  function menuItems(vocabulary: Vocabulary): RowMenuItem[] {
    return [
      {
        id: 'rename',
        label: tCommon('rename'),
        icon: 'pencil',
        onSelect: () => onAction('rename', vocabulary),
      },
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
          <span className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate">{vocabulary.name}</span>
            {vocabulary.id === currentVocabulary && (
              <span className="text-xs font-semibold text-primary">
                {t('active')}
              </span>
            )}
          </span>
        </ListRow>
      ))}
    </ul>
  );
}
