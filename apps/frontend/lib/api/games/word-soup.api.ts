import { apiRequest } from '../http';

type CourtCell = { char: string; revealed: boolean; highlightedByPlayerId?: number };

export const wordSoupApi = {
  initCourt(gameId: number): Promise<{
    visibleCourt: CourtCell[][];
    playerColours: Record<number, string>;
    playerWordCounts: Record<number, number>;
    solutionWords: string[];
  }> {
    return apiRequest(`/games/${gameId}/initWordSoupCourt`, { method: 'POST' });
  },
};
