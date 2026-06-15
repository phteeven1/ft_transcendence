/**
 * UI-facing type aliases for API DTOs.
 * Pages/components import from here; HTTP details live in lib/api/.
 */
export type { UserDto as User } from '@/lib/api/users/types';
export type { GroupDto as Group } from '@/lib/api/groups/types';
export type { MemberDto as Member } from '@/lib/api/groups/types';
export type { PlayerDto as Player } from '@/lib/api/players/types';
export type { VocabularyDto as Vocabulary } from '@/lib/api/vocabularies/types';
export type { GameDto as Game } from '@/lib/api/games/types';

export type CrosswordPlacement = {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  number?: number;
};

export type CrosswordPuzzle = {
  gameId: number;
  rows: number;
  cols: number;
  playerGrid: Array<Array<string | null>>;
  clues: {
    across: CrosswordPlacement[];
    down: CrosswordPlacement[];
  };
  revision: number;
  solved: boolean;
};

export type CrosswordUpdate = {
  row: number;
  col: number;
  letter: string;
};
