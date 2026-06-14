'use client';
/*
Means-What puzzle: player sees a meaning and picks the matching word from three options.
- Picks a random entry from the vocabulary on mount.
  If vocabulary has fewer than 3 words, calls onSkip immediately.
- Two distractor words are picked randomly from the remaining entries.
- The three answer buttons are shuffled so the correct answer is not always in the same position.
- One attempt only: clicking any button locks in the answer.
- Correct guess: wrong buttons dim, correct button turns green, SUCCESS appears, Skip → Next.
- Wrong guess: wrong buttons dim, clicked button turns red, correct button turns green,
  FALSE appears, Skip → Next.
- Layout: buttons side by side on desktop/landscape, stacked on portrait mobile.
*/
import { useState, useEffect, useRef } from 'react';
import type { VocabularyDto } from '@/lib/api/vocabularies/types';

interface Props {
  vocabulary: VocabularyDto;
  onSkip: () => void;
}

interface AnswerOption {
  word: string;
  correct: boolean;
}

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

export default function MeansWhatPuzzle({ vocabulary, onSkip }: Props) {
  const [meaning, setMeaning] = useState('');
  const [options, setOptions] = useState<AnswerOption[]>([]);
  const [guessed, setGuessed] = useState(false);
  const [result, setResult] = useState<'success' | 'false' | null>(null);
  // selectedIndex and correctIndex kept in refs — only needed for styling, not re-rendering
  const selectedIndexRef = useRef<number | null>(null);
  const correctIndexRef = useRef<number | null>(null);

  // Runs once on mount. Picks a random entry, builds and shuffles the three options.
  // Skips immediately if vocabulary is too small.
  useEffect(() => {
    if (vocabulary.words.length < 3) {
      onSkip();
      return;
    }
    const idx = randomIndex(vocabulary.words.length);
    const built = buildOptions(vocabulary, idx);
    if (!built) {
      onSkip();
      return;
    }
    setMeaning(vocabulary.meanings[idx]);
    // record which index in the shuffled options array is correct
    correctIndexRef.current = built.findIndex((o) => o.correct);
    setOptions(built);
  }, []);

  // Called when player clicks an answer button.
  // One attempt only — guessed flag prevents further clicks.
  const handleGuess = (index: number) => {
    if (guessed) return;
    selectedIndexRef.current = index;
    setGuessed(true);
    setResult(options[index].correct ? 'success' : 'false');
  };

  // Returns the Tailwind classes for each button depending on game state
  const buttonClasses = (index: number): string => {
    const base = [
      'flex-1 px-4 py-3 rounded-lg text-sm font-semibold text-gray-800 text-left',
      'border border-gray-200',
      'shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.15)]',
      'transition-colors duration-200',
      'whitespace-normal break-words',
    ];

    if (!guessed) {
      base.push('bg-white hover:bg-gray-50 cursor-pointer');
    } else if (result === 'success') {
      // correct guess: correct button green, others dim
      if (options[index].correct) {
        base.push('bg-emerald-100 border-emerald-400 text-emerald-800');
      } else {
        base.push('bg-white opacity-35 cursor-default');
      }
    } else {
      // wrong guess: all dim, correct stays white
      if (options[index].correct) {
        base.push('bg-white cursor-default');
      } else {
        base.push('bg-white opacity-35 cursor-default');
      }
    }

    return base.join(' ');
  };

  if (options.length === 0) return null;

  return (
    <div className="flex flex-col h-full px-4 py-3 select-none">

      {/* Prompt */}
      <p className="text-sm text-gray-500 mb-1">What best translates…</p>
      <p className="text-base font-semibold text-gray-800 mb-4 leading-snug">{meaning}</p>

      {/* Answer buttons — row on landscape/desktop, column on portrait mobile */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 items-stretch">
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
      <div className="flex items-center justify-between mt-3">
        <span
          className={[
            'text-sm font-semibold transition-opacity duration-300',
            result === 'success' ? 'text-emerald-500 opacity-100' : '',
            result === 'false' ? 'text-red-500 opacity-100' : '',
            result === null ? 'opacity-0' : '',
          ].join(' ')}
        >
          {result === 'success' ? 'SUCCESS!' : result === 'false' ? 'FALSE' : ''}
        </span>
        <button
          onClick={onSkip}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          {guessed ? 'Next' : 'Skip'}
        </button>
      </div>
    </div>
  );
}