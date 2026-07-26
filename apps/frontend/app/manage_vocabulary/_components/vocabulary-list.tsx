'use client';
import { useTranslations } from 'next-intl';
import { Vocabulary } from '../../types';

type Props = {
  vocabularies: Vocabulary[];
  selectedVocabulary: Vocabulary | null;
  currentVocabulary: number | undefined;
  isLoading: boolean;
  onSelect: (vocabulary: Vocabulary) => void;
};

export default function VocabularyList({
  vocabularies,
  selectedVocabulary,
  currentVocabulary,
  isLoading,
  onSelect,
}: Props) {
  const t = useTranslations('vocabulary');
  const tCommon = useTranslations('common');

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{tCommon('loadingEllipsis')}</p>;
  }
  if (vocabularies.length === 0) {
    return (
      <p className="text-muted-foreground text-sm italic">{t('noVocabularies')}</p>
    );
  }

  return (
    <ul className="clay-panel overflow-y-auto max-h-64 md:max-h-full md:h-full">
      {vocabularies.map((vocabulary) => (
        <li key={vocabulary.id} className="border-b border-border last:border-b-0">
          <button
            onClick={() => onSelect(vocabulary)}
            className={`w-full text-left px-3 py-2 transition-colors flex items-center justify-between ${
              selectedVocabulary?.id === vocabulary.id
                ? 'bg-muted font-medium text-foreground'
                : 'text-foreground hover:bg-muted/50'
            }`}
          >
            <span>{vocabulary.name}</span>
            {vocabulary.id === currentVocabulary && (
              <span className="text-xs font-semibold text-primary">{t('active')}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
