import { apiRequest } from '../http';
import type { CrosswordPuzzleDto, CrosswordCheckResult } from './types';

/**
 * crossword-logic Addition: Difficulty levels for puzzle generation
 * Easy: 5 words, 15x15 grid
 * Medium: 8 words, 20x20 grid
 * Hard: 12 words, 25x25 grid
 */
export type WordBuildingDifficulty = 'easy' | 'medium' | 'hard';

/**
 * crossword-logic Addition: API client for crossword puzzle operations
 */
export const crosswordApi = {
  /**
   * crossword-logic Addition: Fetch existing puzzle for a game
   * @param gameId - Game identifier
   * @param difficulty - Optional difficulty filter (currently unused in GET)
   */
  get(gameId: number, difficulty?: WordBuildingDifficulty): Promise<CrosswordPuzzleDto> {
    const url = difficulty ? `crossword/${gameId}?difficulty=${difficulty}` : `crossword/${gameId}`;
    return apiRequest<CrosswordPuzzleDto>(url);
  },

  /**
   * crossword-logic Addition: Initialize new puzzle with selected difficulty
   * @param gameId - Game identifier
   * @param difficulty - Puzzle difficulty level
   * @param forceRegenerate - If true, regenerates puzzle even if one exists
   */
  init(gameId: number, difficulty?: WordBuildingDifficulty, forceRegenerate = true): Promise<CrosswordPuzzleDto> {
    return apiRequest<CrosswordPuzzleDto>(`crossword/init`, {
      method: 'POST',
      body: JSON.stringify({ gameId, difficulty, forceRegenerate }),
    });
  },

  /**
   * crossword-logic Addition: Update single cell with player's letter
   */
  updateCell(gameId: number, row: number, col: number, letter: string): Promise<CrosswordPuzzleDto> {
    return apiRequest<CrosswordPuzzleDto>(`crossword/${gameId}/cell`, {
      method: 'POST',
      body: JSON.stringify({ row, col, letter }),
    });
  },

  /**
   * crossword-logic Addition: Check solution and get list of wrong cells
   */
  check(gameId: number): Promise<CrosswordCheckResult> {
    return apiRequest<CrosswordCheckResult>(`crossword/${gameId}/check`);
  },
};
