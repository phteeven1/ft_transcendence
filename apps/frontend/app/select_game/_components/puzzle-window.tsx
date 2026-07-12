'use client';
/*
Fetches the group's current vocabulary fresh on each mount (two-step: group → vocabulary).
This guarantees that if a parent changes the active vocabulary on another device,
the next puzzle sees the update — without affecting any already-running puzzle or game.
Passes the full VocabularyDto down to whichever puzzle component renders.
If there is no active vocabulary, or all words are too short, shows a skip-only fallback.
*/
import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../context/auth-context';
import { groupsApi } from '@/lib/api';
import { vocabulariesApi } from '@/lib/api';
import type { VocabularyDto } from '@/lib/api/vocabularies/types';
import ScramblePuzzle from '../_puzzles/scramble-puzzle';
import MeansWhatPuzzle from '../_puzzles/means-what-puzzle';
import CorrectionPuzzle from '../_puzzles/correction-puzzle';
import { Button } from '../../components/ui/button';

const PUZZLE_COUNT = 3;

function randomPuzzleIndex(): number {
  return Math.floor(Math.random() * PUZZLE_COUNT);
}

export default function PuzzleWindow() {
  const t = useTranslations('games.puzzle');
  const tCommon = useTranslations('common');
  const { player } = useAuth();
  const [vocabulary, setVocabulary] = useState<VocabularyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [puzzleIndex, setPuzzleIndex] = useState<number>(randomPuzzleIndex);
  const [key, setKey] = useState<number>(0);

  // Two-step fetch: get fresh player to find currentVocabulary id,
  // then fetch that vocabulary. Done on mount only — this vocabulary
  // is frozen for the lifetime of this PuzzleWindow instance.
  useEffect(() => {
    if (!player) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const freshGroup = await groupsApi.getById(player.inGroup);  // ← player.inGroup
        if (!freshGroup.currentVocabulary) {
          setLoading(false);
          return;
        }
        const vocab = await vocabulariesApi.getById(freshGroup.currentVocabulary);
        setVocabulary(vocab);
      } catch (error) {
        console.error('PuzzleWindow: failed to load vocabulary', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [player]);

  const handleSkip = useCallback(async () => {
    if (!player) return;
    try {
      const freshGroup = await groupsApi.getById(player.inGroup);
      if (freshGroup.currentVocabulary) {
        const vocab = await vocabulariesApi.getById(freshGroup.currentVocabulary);
        setVocabulary(vocab);
      } else {
        setVocabulary(null);
      }
    } catch (error) {
      console.error('PuzzleWindow: failed to refresh vocabulary on skip', error);
    }
    setKey((k) => k + 1);
    setPuzzleIndex(randomPuzzleIndex());
  }, [player]);

  const renderPuzzle = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          {t('loading')}
        </div>
      );
    }
    if (!vocabulary) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <p className="text-muted-foreground text-sm">{t('noVocabulary')}</p>
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            {tCommon('skip')}
          </Button>
        </div>
      );
    }

    const props = { vocabulary, onSkip: handleSkip };
    switch (puzzleIndex) {
      case 0: return <ScramblePuzzle key={key} {...props} />;
      case 1: return <MeansWhatPuzzle key={key} {...props} />;
      case 2: return <CorrectionPuzzle key={key} {...props} />;
      default: return <ScramblePuzzle key={key} {...props} />;
    }
  };

  return (
    <div className="clay-panel w-full aspect-[1/1] md:aspect-[4/1] overflow-hidden">
      {renderPuzzle()}
    </div>
  );
}