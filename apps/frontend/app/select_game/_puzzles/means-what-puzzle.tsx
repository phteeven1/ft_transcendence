'use client';
/*
Means-What puzzle: player sees a meaning and picks the matching word from three options.
- Picks a random entry from the vocabulary on mount.
- Two distractor words are picked randomly from the remaining entries.
- The three answer buttons are shuffled so the correct answer is not always in the same position.
- One attempt only: clicking any button locks in the answer.
- Correct guess: wrong buttons dim, correct button flashes orange three times, then turns
  green, SUCCESS appears, Skip → Next.
- Wrong guess: wrong buttons dim, clicked button turns red, correct button turns green,
  FALSE appears, Skip → Next.
- Layout: buttons side by side on desktop/landscape, stacked on portrait mobile.
*/
import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { VocabularyDto } from '@/lib/api/vocabularies/types';
import { Button } from '../../components/ui/button';

interface Props {
  vocabulary: VocabularyDto;
  onSkip: () => void;
}

interface AnswerOption {
  word: string;
  correct: boolean;
}

const BLINK_DURATION_MS = 900;

// Pick a random index from an array
function randomIndex(length: number): number {
  return Math.floor(Math.random() * length);
}

// Fisher-Yates shuffle — same pattern as scramble-puzzle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build three answer options: one correct, two distractors, then shuffle.
// Returns null if the vocabulary has fewer than 3 entries.
function buildOptions(vocabulary: VocabularyDto, correctIndex: number): AnswerOption[] | null {
  if (vocabulary.words.length < 3) return null;

  const distractorIndices: number[] = [];
  while (distractorIndices.length < 2) {
    const idx = randomIndex(vocabulary.words.length);
    if (idx !== correctIndex && !distractorIndices.includes(idx)) {
      distractorIndices.push(idx);
    }
  }

  const options: AnswerOption[] = [
    { word: vocabulary.words[correctIndex], correct: true },
    { word: vocabulary.words[distractorIndices[0]], correct: false },
    { word: vocabulary.words[distractorIndices[1]], correct: false },
  ];

  return shuffle(options);
}

type PuzzleData =
  | { kind: 'skip' }
  | { kind: 'ready'; meaning: string; options: AnswerOption[]; correctIndex: number };

function buildPuzzleData(vocabulary: VocabularyDto): PuzzleData {
  if (vocabulary.words.length < 3) return { kind: 'skip' };
  const idx = randomIndex(vocabulary.words.length);
  const built = buildOptions(vocabulary, idx);
  if (!built) return { kind: 'skip' };
  return {
    kind: 'ready',
    meaning: vocabulary.meanings[idx],
    options: built,
    correctIndex: built.findIndex((o) => o.correct),
  };
}

export default function MeansWhatPuzzle({ vocabulary, onSkip }: Props) {
  const t = useTranslations('games.puzzle');
  const tCommon = useTranslations('common');
  const puzzleData = useMemo(() => buildPuzzleData(vocabulary), [vocabulary]);
  const [guessed, setGuessed] = useState(false);
  const [result, setResult] = useState<'success' | 'false' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [blinking, setBlinking] = useState(false);
  const blinkTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (blinkTimeoutRef.current !== null) {
        window.clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, []);

  const handleGuess = (index: number) => {
    if (guessed || puzzleData.kind !== 'ready') return;
    setSelectedIndex(index);
    setGuessed(true);
    if (puzzleData.options[index].correct) {
      setBlinking(true);
      blinkTimeoutRef.current = window.setTimeout(() => {
        blinkTimeoutRef.current = null;
        setBlinking(false);
        setResult('success');
      }, BLINK_DURATION_MS);
      return;
    }
    setResult('false');
  };

  const buttonClasses = (index: number): string => {
    if (puzzleData.kind !== 'ready') return '';
    const { options, correctIndex } = puzzleData;
    const base = [
      'flex-1 shrink-0 px-4 py-3 rounded-lg text-sm font-semibold text-left clay-panel',
      'whitespace-normal break-words',
    ];

    if (!guessed) {
      base.push(
        'cursor-pointer text-foreground transition-colors duration-200 hover:opacity-90',
      );
    } else if (blinking) {
      if (options[index].correct) {
        base.push('animate-blink-orange cursor-default');
      } else {
        base.push('cursor-default text-foreground opacity-35');
      }
    } else if (result === 'success') {
      if (options[index].correct) {
        base.push('cursor-default border-primary text-primary');
      } else {
        base.push('cursor-default text-foreground opacity-35');
      }
    } else {
      if (index === selectedIndex) {
        base.push('cursor-default border-destructive text-destructive');
      } else if (index === correctIndex) {
        base.push('cursor-default border-primary text-primary');
      } else {
        base.push('cursor-default text-foreground opacity-35');
      }
    }

    return base.join(' ');
  };

  if (puzzleData.kind !== 'ready') return null;

  const { meaning, options } = puzzleData;

  return (
    <div className="flex min-h-0 flex-col px-4 py-3 select-none md:h-full">

      {/* Prompt */}
      <p className="mb-1 shrink-0 text-sm text-muted-foreground">{t('meansWhatPrompt')}</p>
      <p className="mb-4 shrink-0 font-heading text-base font-semibold leading-snug text-foreground">
        {meaning}
      </p>

      {/* Answer buttons — row on landscape/desktop, column on portrait mobile */}
      <div className="flex min-h-0 flex-1 flex-col items-stretch gap-3 md:flex-row">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleGuess(index)}
            disabled={guessed}
            className={buttonClasses(index)}
          >
            {option.word}
          </button>
        ))}
      </div>

      {/* Bottom bar: result label + skip/next button */}
      <div className="mt-3 flex shrink-0 items-center justify-between">
        <span
          className={[
            'text-sm font-semibold transition-opacity duration-300',
            result === 'success' ? 'text-primary opacity-100' : '',
            result === 'false' ? 'text-destructive opacity-100' : '',
            result === null ? 'opacity-0' : '',
          ].join(' ')}
        >
          {result === 'success' ? t('success') : result === 'false' ? t('false') : ''}
        </span>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          {guessed ? tCommon('next') : tCommon('skip')}
        </Button>
      </div>
    </div>
  );
}
