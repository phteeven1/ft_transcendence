import {
  canPlace,
  collectValidPlacements,
  createEmptyCourt,
  generateTrueCourt,
  normalizeVocabularyWords,
  placeWord,
} from './word-soup-placement-engine';
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
    expect(placedWords.every((word) => words.includes(word))).toBe(true);

    for (const word of placedWords) {
      const placements = collectValidPlacements(trueCourt, word);
      // Word must exist somewhere as an exact placement (overlaps allowed with itself).
      const found = placements.some((placement) => {
        const [dx, dy] = placement.direction;
        return word.split('').every((ch, i) => {
          const cell =
            trueCourt[placement.row + i * dx][placement.col + i * dy];
          return cell.char === ch;
        });
      });
      expect(found).toBe(true);
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
});

describe('canPlace / placeWord', () => {
  it('allows overlapping matching letters and rejects conflicts', () => {
    const court = createEmptyCourt();
    placeWord(court, 'CAT', 0, 0, [0, 1]);
    expect(canPlace(court, 'CAR', 0, 0, [0, 1])).toBe(false);
    expect(canPlace(court, 'CAP', 0, 0, [1, 0])).toBe(true);
  });
});
