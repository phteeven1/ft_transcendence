import { apiRequest } from '../http';

type CourtCell = { char: string };

export const wordSoupApi = {
  initCourt(gameId: number): Promise<{
    trueCourt: CourtCell[][];
    visibleCourt: CourtCell[][];
  }> {
    return apiRequest(`/games/${gameId}/initWordSoupCourt`, { method: 'POST' });
  },
};