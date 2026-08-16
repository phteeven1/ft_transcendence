'use client';
/*
Fetches the group's current vocabulary once on mount (two-step: group → vocabulary).
Passes the VocabularyDto down to whichever puzzle type can actually run.
Skip only remounts a viable puzzle locally — it does not refetch the list.
*/
import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { vocabulariesApi } from '@/lib/api';
import type { VocabularyDto } from '@/lib/api/vocabularies/types';
import ScramblePuzzle from '../_puzzles/scramble-puzzle';
import MeansWhatPuzzle from '../_puzzles/means-what-puzzle';
import { Button } from '../../components/ui/button';

const SCRAMBLE_INDEX = 0;
const MEANS_WHAT_INDEX = 1;
const SCRAMBLE_MIN_LETTERS = 3;
const MEANS_WHAT_MIN_WORDS = 3;

function canPlayScramble(vocabulary: VocabularyDto): boolean {
  return vocabulary.words.some(
    (word) => word.replace(/ /g, '').length >= SCRAMBLE_MIN_LETTERS,
  );
}

function canPlayMeansWhat(vocabulary: VocabularyDto): boolean {
  return vocabulary.words.length >= MEANS_WHAT_MIN_WORDS;
}

function viablePuzzleIndices(vocabulary: VocabularyDto): number[] {
  const indices: number[] = [];
  if (canPlayScramble(vocabulary)) indices.push(SCRAMBLE_INDEX);
  if (canPlayMeansWhat(vocabulary)) indices.push(MEANS_WHAT_INDEX);
  return indices;
}

function pickPuzzleIndex(
  vocabulary: VocabularyDto,
  avoid?: number,
): number | null {
  const viable = viablePuzzleIndices(vocabulary);
  if (viable.length === 0) return null;
  const choices =
    avoid === undefined ? viable : viable.filter((index) => index !== avoid);
  const pool = choices.length > 0 ? choices : viable;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function PuzzleWindow() {
  const t = useTranslations('games.puzzle');
  const tCommon = useTranslations('common');
  const { player } = useAuth();
  const playerId = player?.id ?? 0;
  const groupId = player?.inGroup ?? 0;
  const [vocabulary, setVocabulary] = useState<VocabularyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [puzzleIndex, setPuzzleIndex] = useState<number>(SCRAMBLE_INDEX);
  const [key, setKey] = useState<number>(0);

  const loadVocabulary = useCallback(async (): Promise<void> => {
    if (!groupId) {
      setVocabulary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const freshGroup = await groupsApi.getById(groupId);
      if (!freshGroup.currentVocabulary) {
        setVocabulary(null);
        return;
      }
      const vocab = await vocabulariesApi.getById(freshGroup.currentVocabulary);
      setVocabulary(vocab);
      const nextIndex = pickPuzzleIndex(vocab);
      if (nextIndex !== null) setPuzzleIndex(nextIndex);
    } catch {
      setVocabulary(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void loadVocabulary();
  }, [loadVocabulary, playerId]);

  const handleSkip = useCallback(() => {
    if (!vocabulary) return;
    const nextIndex = pickPuzzleIndex(vocabulary, puzzleIndex);
    if (nextIndex === null) return;
    setPuzzleIndex(nextIndex);
    setKey((k) => k + 1);
  }, [puzzleIndex, vocabulary]);

  const renderPuzzle = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          {t('loading')}
        </div>
      );
    }
    const viable = vocabulary ? viablePuzzleIndices(vocabulary) : [];
    if (!vocabulary || viable.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <p className="text-muted-foreground text-sm">{t('noVocabulary')}</p>
          <Button variant="ghost" size="sm" onClick={() => void loadVocabulary()}>
            {tCommon('skip')}
          </Button>
        </div>
      );
    }

    const props = { vocabulary, onSkip: handleSkip };
    if (puzzleIndex === MEANS_WHAT_INDEX && canPlayMeansWhat(vocabulary)) {
      return <MeansWhatPuzzle key={key} {...props} />;
    }
    return <ScramblePuzzle key={key} {...props} />;
  };

  return (
    <div className="clay-panel w-full aspect-[1/1] md:aspect-[4/1] overflow-hidden">
      {renderPuzzle()}
    </div>
  );
}
