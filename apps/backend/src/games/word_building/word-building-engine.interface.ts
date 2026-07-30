export interface IEngineResult {
  rows: number;
  cols: number;
  solution: (string | null)[][];
  placements: Array<{
    word: string;
    clue: string;
    row: number;
    col: number;
    direction: 'across' | 'down';
    number: number;
  }>;
}

export interface IWordBuildingPuzzleEngine {
  generate(
    entries: Array<{ word: string; clue: string }>,
  ): IEngineResult & { unplacedWords: string[] };
}
