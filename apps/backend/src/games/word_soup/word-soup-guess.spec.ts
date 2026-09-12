import { createEmptyCourt } from './word-soup-placement-engine';
import { COURT_COLS, COURT_ROWS } from './word-soup.constants';
import { resolveEmbeddedWordHintKey } from './word-soup-guess-helpers';
import type {
  PlacedWordMetadata,
  SharedWordSoupCourt,
} from './word-soup.types';

/**
 * Lightweight coverage for selection-direction rules that live on the service.
 * We re-implement the pure helper here to keep the Nest service uninstantiated.
 * Keep in sync with WordSoupService.getSelectionDirection.
 */
function getSelectionDirection(
  selection: Array<{ row: number; col: number }>,
): [number, number] | null {
  if (selection.length < 2) return null;

  const [first, second] = selection;
  const rowDelta = second.row - first.row;
  const colDelta = second.col - first.col;

  if (rowDelta === 0 && colDelta === 0) return null;
  if (rowDelta !== 0 && colDelta !== 0) return null;
  if (Math.abs(rowDelta) > 1 || Math.abs(colDelta) > 1) return null;

  const oneStepRow = rowDelta === 0 ? 0 : rowDelta / Math.abs(rowDelta);
  const oneStepCol = colDelta === 0 ? 0 : colDelta / Math.abs(colDelta);

  const isStraightLine = selection.every((position, index) => {
    if (index === 0) return true;
    const previous = selection[index - 1];
    const deltaRow = position.row - previous.row;
    const deltaCol = position.col - previous.col;
    if (deltaRow === 0 && deltaCol === 0) return false;
    if (deltaRow !== 0 && deltaCol !== 0) return false;
    if (Math.abs(deltaRow) > 1 || Math.abs(deltaCol) > 1) return false;
    return (
      (deltaRow === 0 || deltaRow === oneStepRow) &&
      (deltaCol === 0 || deltaCol === oneStepCol)
    );
  });

  if (!isStraightLine) return null;
  return [oneStepRow, oneStepCol];
}

function isCourtComplete(
  court: Pick<SharedWordSoupCourt, 'solutionWords' | 'foundWords'>,
) {
  return (
    court.solutionWords.length > 0 &&
    court.foundWords.length >= court.solutionWords.length
  );
}

describe('getSelectionDirection', () => {
  it('accepts contiguous horizontal and vertical selections', () => {
    expect(
      getSelectionDirection([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ]),
    ).toEqual([0, 1]);

    expect(
      getSelectionDirection([
        { row: 1, col: 2 },
        { row: 2, col: 2 },
      ]),
    ).toEqual([1, 0]);
  });

  it('rejects diagonals, gaps, and single cells', () => {
    expect(getSelectionDirection([{ row: 0, col: 0 }])).toBeNull();
    expect(
      getSelectionDirection([
        { row: 0, col: 0 },
        { row: 1, col: 1 },
      ]),
    ).toBeNull();
    expect(
      getSelectionDirection([
        { row: 0, col: 0 },
        { row: 0, col: 2 },
      ]),
    ).toBeNull();
  });
});

describe('post-complete guard', () => {
  it('marks the court complete when all solution words are found', () => {
    const court = {
      solutionWords: [
        {
          word: 'CAT',
          startRow: 0,
          startCol: 0,
          endRow: 0,
          endCol: 2,
          direction: [0, 1] as [number, number],
        },
        {
          word: 'DOG',
          startRow: 1,
          startCol: 0,
          endRow: 1,
          endCol: 2,
          direction: [0, 1] as [number, number],
        },
      ],
      foundWords: [
        {
          word: 'CAT',
          playerId: 1,
          cells: [],
          direction: [0, 1] as [number, number],
        },
        {
          word: 'DOG',
          playerId: 2,
          cells: [],
          direction: [0, 1] as [number, number],
        },
      ],
    };
    expect(isCourtComplete(court)).toBe(true);
    expect(
      isCourtComplete({
        solutionWords: [
          {
            word: 'CAT',
            startRow: 0,
            startCol: 0,
            endRow: 0,
            endCol: 2,
            direction: [0, 1],
          },
        ],
        foundWords: [],
      }),
    ).toBe(false);
  });

  it('createEmptyCourt matches configured dimensions', () => {
    const court = createEmptyCourt();
    expect(COURT_ROWS).toBe(COURT_COLS);
    expect(court).toHaveLength(COURT_ROWS);
    expect(court[0]).toHaveLength(COURT_COLS);
  });
});

describe('resolveEmbeddedWordHintKey', () => {
  const tableTennis: PlacedWordMetadata = {
    word: 'TABLE TENNIS',
    startRow: 0,
    startCol: 0,
    endRow: 0,
    endCol: 11,
    direction: [0, 1],
  };
  const tennis: PlacedWordMetadata = {
    word: 'TENNIS',
    startRow: 2,
    startCol: 0,
    endRow: 2,
    endCol: 5,
    direction: [0, 1],
  };

  function courtWithPhrase() {
    const trueCourt = createEmptyCourt();
    for (let i = 0; i < tableTennis.word.length; i++) {
      trueCourt[0][i] = { char: tableTennis.word[i] };
    }
    for (let i = 0; i < tennis.word.length; i++) {
      trueCourt[2][i] = { char: tennis.word[i] };
    }
    return trueCourt;
  }

  it('hints wrongPosition when TENNIS is selected from TABLE TENNIS', () => {
    const selection = Array.from({ length: 6 }, (_, i) => ({
      row: 0,
      col: 6 + i,
    }));

    expect(
      resolveEmbeddedWordHintKey(
        [tableTennis, tennis],
        [],
        courtWithPhrase(),
        selection,
      ),
    ).toBe('wrongPosition');
  });

  it('hints alreadyFoundElsewhere when the shorter word was already found', () => {
    const selection = Array.from({ length: 6 }, (_, i) => ({
      row: 0,
      col: 6 + i,
    }));

    expect(
      resolveEmbeddedWordHintKey(
        [tableTennis, tennis],
        [
          {
            word: 'TENNIS',
            playerId: 1,
            cells: Array.from({ length: 6 }, (_, i) => ({ row: 2, col: i })),
            direction: [0, 1],
          },
        ],
        courtWithPhrase(),
        selection,
      ),
    ).toBe('alreadyFoundElsewhere');
  });

  it('returns null for unrelated incorrect selections', () => {
    const trueCourt = createEmptyCourt();
    trueCourt[0][0] = { char: 'X' };
    trueCourt[0][1] = { char: 'Y' };
    expect(
      resolveEmbeddedWordHintKey([tableTennis, tennis], [], trueCourt, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]),
    ).toBeNull();
  });
});
