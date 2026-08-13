import {
  canPlace,
  createEmptyCourt,
  generateTrueCourt,
  hasValidOverlaps,
  normalizeVocabularyWords,
  placeWord,
} from './word-soup-placement-engine';
import type { PlacedWordMetadata } from './word-soup.types';
import { COURT_COLS, COURT_ROWS } from './word-soup.constants';

describe('normalizeVocabularyWords', () => {
  it('keeps letter-only words and phrase words with spaces/hyphens', () => {
    expect(
      normalizeVocabularyWords([
        'cat',
        ' dog ',
        'hi!',
        'BUS STOP',
        'merry-go',
        'CAT',
        'a',
      ]),
    ).toEqual(['CAT', 'DOG', 'BUS STOP', 'MERRY-GO', 'A']);
  });

  it('rejects words longer than the grid', () => {
    const long = 'A'.repeat(COURT_COLS + 1);
    expect(normalizeVocabularyWords([long, 'OK'])).toEqual(['OK']);
  });
});

describe('generateTrueCourt', () => {
  it('only returns successfully placed words as placedWords', () => {
    const words = ['HELLO', 'WORLD', 'TEST', 'SOUP', 'WORD'];
    const { trueCourt, placedWords } = generateTrueCourt(words);

    expect(placedWords.length).toBeGreaterThan(0);
    expect(placedWords.every((placed) => words.includes(placed.word))).toBe(
      true,
    );

    for (const placed of placedWords) {
      const [dx, dy] = placed.direction;
      const lettersMatch = placed.word.split('').every((ch, i) => {
        const cell =
          trueCourt[placed.startRow + i * dx][placed.startCol + i * dy];
        return cell.char === ch;
      });
      expect(lettersMatch).toBe(true);
    }
  });

  it('respects crossing budget by still placing isolated words', () => {
    const words = [
      'APPLE',
      'PEAR',
      'PLUM',
      'FIG',
      'DATE',
      'LIME',
      'MELON',
      'BERRY',
    ];
    const { placedWords } = generateTrueCourt(words, 2);
    expect(placedWords.length).toBeGreaterThanOrEqual(2);
    expect(placedWords.length).toBeLessThanOrEqual(words.length);
  });

  it('fails to place nothing when vocabulary is empty', () => {
    const { placedWords, trueCourt } = generateTrueCourt([]);
    expect(placedWords).toEqual([]);
    expect(trueCourt).toHaveLength(COURT_ROWS);
    expect(trueCourt[0]).toHaveLength(COURT_COLS);
  });

  it('only allows perpendicular single-letter overlaps between words', () => {
    for (let attempt = 0; attempt < 20; attempt++) {
      const { placedWords } = generateTrueCourt(
        ['RUNNING', 'GOLF', 'CAT', 'DOG', 'BIRD', 'FISH'],
        6,
      );

      for (let i = 0; i < placedWords.length; i++) {
        for (let j = i + 1; j < placedWords.length; j++) {
          const a = placedWords[i];
          const b = placedWords[j];
          const aCells = new Set(
            Array.from({ length: a.word.length }, (_, k) => {
              const [dx, dy] = a.direction;
              return `${a.startRow + k * dx},${a.startCol + k * dy}`;
            }),
          );
          const shared = Array.from({ length: b.word.length }, (_, k) => {
            const [dx, dy] = b.direction;
            return `${b.startRow + k * dx},${b.startCol + k * dy}`;
          }).filter((key) => aCells.has(key));

          if (shared.length === 0) continue;
          expect(shared.length).toBe(1);
          expect(
            a.direction[0] * b.direction[0] + a.direction[1] * b.direction[1],
          ).toBe(0);
        }
      }
    }
  });
});

describe('hasValidOverlaps', () => {
  it('rejects same-direction shared letters (RUNNINGOLF-style)', () => {
    const placed: PlacedWordMetadata[] = [
      {
        word: 'RUNNING',
        startRow: 0,
        startCol: 0,
        endRow: 0,
        endCol: 6,
        direction: [0, 1],
      },
    ];

    // GOLF would start at RUNNING's trailing G -> RUNNINGOLF
    expect(hasValidOverlaps('GOLF', 0, 6, [0, 1], placed)).toBe(false);
  });

  it('allows a single perpendicular shared letter', () => {
    const placed: PlacedWordMetadata[] = [
      {
        word: 'CAT',
        startRow: 0,
        startCol: 0,
        endRow: 0,
        endCol: 2,
        direction: [0, 1],
      },
    ];

    // Vertical word crossing at A
    expect(hasValidOverlaps('BAG', 0, 1, [1, 0], placed)).toBe(true);
  });

  it('allows crossing two different words at one letter each', () => {
    const placed: PlacedWordMetadata[] = [
      {
        word: 'CAT',
        startRow: 0,
        startCol: 0,
        endRow: 0,
        endCol: 2,
        direction: [0, 1],
      },
      {
        word: 'DOG',
        startRow: 2,
        startCol: 0,
        endRow: 2,
        endCol: 2,
        direction: [0, 1],
      },
    ];

    // Vertical word crossing CAT at A and DOG at O
    expect(hasValidOverlaps('AORTA', 0, 1, [1, 0], placed)).toBe(true);
  });
});

describe('canPlace / placeWord', () => {
  it('allows overlapping matching letters and rejects conflicts', () => {
    const court = createEmptyCourt();
    placeWord(court, 'CAT', 0, 0, [0, 1]);
    expect(canPlace(court, 'CAR', 0, 0, [0, 1])).toBe(false);
    expect(canPlace(court, 'CAP', 0, 0, [1, 0])).toBe(true);
  });
});
