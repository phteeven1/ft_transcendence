import type {
  CourtCell,
  FoundWord,
  GuessMessageKey,
  PlacedWordMetadata,
  Position,
} from './word-soup.types';

export function wordFromCells(court: CourtCell[][], cells: Position[]): string {
  return cells.map(({ row, col }) => court[row]?.[col]?.char ?? '').join('');
}

export function cellsForPlacedWord(placed: PlacedWordMetadata): Position[] {
  const [dx, dy] = placed.direction;
  return Array.from({ length: placed.word.length }, (_, i) => ({
    row: placed.startRow + i * dx,
    col: placed.startCol + i * dy,
  }));
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function includesSubarray(
  haystack: string[],
  needle: string[],
): boolean {
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    if (needle.every((key, offset) => haystack[i + offset] === key)) {
      return true;
    }
  }
  return false;
}

export function isContiguousSubpath(
  parentCells: Position[],
  childCells: Position[],
): boolean {
  if (childCells.length === 0 || childCells.length >= parentCells.length) {
    return false;
  }

  const parentKeys = parentCells.map((cell) => cellKey(cell.row, cell.col));
  const childKeys = childCells.map((cell) => cellKey(cell.row, cell.col));
  const childKeysReversed = [...childKeys].reverse();

  return (
    includesSubarray(parentKeys, childKeys) ||
    includesSubarray(parentKeys, childKeysReversed)
  );
}

/**
 * When a player selects a full solution word that sits inside a longer placed
 * phrase (TENNIS inside TABLE TENNIS), return a non-freezing hint key.
 */
export function resolveEmbeddedWordHintKey(
  solutionWords: PlacedWordMetadata[],
  foundWords: FoundWord[],
  trueCourt: CourtCell[][],
  selection: Position[],
): GuessMessageKey | null {
  const selectionWord = wordFromCells(trueCourt, selection);
  const selectionWordReversed = [...selectionWord].reverse().join('');

  const shorterMatches = solutionWords.filter(
    (solution) =>
      solution.word === selectionWord ||
      solution.word === selectionWordReversed,
  );
  if (shorterMatches.length === 0) return null;

  const shorterWord = shorterMatches[0].word;
  const hostedInsideLonger = solutionWords.some((longer) => {
    if (longer.word.length <= shorterWord.length) return false;
    if (!longer.word.includes(shorterWord)) return false;
    return isContiguousSubpath(cellsForPlacedWord(longer), selection);
  });

  if (!hostedInsideLonger) return null;

  const shorterAlreadyFound = foundWords.some(
    (found) => found.word === shorterWord,
  );

  return shorterAlreadyFound ? 'alreadyFoundElsewhere' : 'wrongPosition';
}
