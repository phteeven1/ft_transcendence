import { apiRequest } from '../http';
import type { IInitCourtResponse } from './word-building.types';

export type { IGameStatePayload, IInitCourtResponse, ClueEntry, IPlaceLetterDto } from './word-building.types';

type PlayerMeta = {
  id: number;
  name: string;
  avatarTier: number;
  avatarAnimal: number;
};

export const wordBuildingApi = {
  /**
   * Fetches the initial crossword payload for a game.
   * The backend creates the puzzle on first call and rehydrates from the database later.
   *
   * @param gameId Game whose crossword should be initialized.
   * @returns The initial trueCourt, visibleCourt, and clue data.
   */
  initCourt(gameId: number): Promise<IInitCourtResponse> {
    return apiRequest(`/games/${gameId}/initWordBuildingCourt`, { method: 'POST' });
  },

  /**
   * Fetches the player roster for a game so the scoreboard can render names.
   *
   * @param gameId Game whose players should be listed.
   * @returns Player ids and display names.
   */
  getPlayersForGame(gameId: number): Promise<PlayerMeta[]> {
    return apiRequest(`/games/${gameId}/players`);
  },
};
