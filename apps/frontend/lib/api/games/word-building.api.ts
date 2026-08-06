import { apiRequest } from '../http';
import type { IGameStatePayload, IInitCourtResponse } from './word-building.types';

export type { IGameStatePayload, IInitCourtResponse, ClueEntry, IPlaceLetterDto } from './word-building.types';

type GameMeta = {
  id:          number;
  name:        string;
  startedTime: string | null;
  players:     number[];
  isActive:    boolean;
  isFinished:  boolean;
};

type PlayerMeta = {
  id: number;
  name: string;
  avatarTier: number;
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
   * Fetches the current crossword state without rebuilding the puzzle.
   * This is used when a player reconnects mid-game.
   *
   * @param gameId Game whose live state should be fetched.
   * @returns The latest visible court and scores.
   */
  getState(gameId: number): Promise<IGameStatePayload> {
    return apiRequest(`/games/${gameId}/wordBuildingState`);
  },

  /**
   * Fetches the public metadata for a game.
   *
   * @param gameId Game to look up.
   * @returns The game metadata used by the scaffold header.
   */
  getGame(gameId: number): Promise<GameMeta> {
    return apiRequest(`/games/${gameId}`);
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
