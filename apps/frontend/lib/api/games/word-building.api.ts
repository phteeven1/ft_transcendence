import { apiRequest } from '../http';

type CourtCell = { char: string };

export const wordBuildingApi = {
  initCourt(gameId: number): Promise<{
    trueCourt: CourtCell[][];
    visibleCourt: CourtCell[][];
  }> {
    return apiRequest(`/games/${gameId}/initWordBuildingCourt`, { method: 'POST' });
  },
};