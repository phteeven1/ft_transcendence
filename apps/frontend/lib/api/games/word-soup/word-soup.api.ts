import { apiRequest } from '../../http';
import type { WordSoup } from './types';
import type { GameIdPlayerIdInput } from '../types';

export const wordSoupApi = {
  initCourt(input: GameIdPlayerIdInput): Promise<WordSoup.Dto> {
    return apiRequest<WordSoup.Dto>(
      `/games/${input.gameId}/initWordSoupCourt`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  },

  markIntroShown(input: GameIdPlayerIdInput) {
    return apiRequest(`/games/${input.gameId}/markWordSoupIntroShown`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
