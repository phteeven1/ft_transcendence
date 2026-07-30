import { apiRequest } from '../../http';
import type { WordSoupDto } from './types';
import type { GameIdPlayerIdInput } from '../types';

export const wordSoupApi = {
  initCourt(input: GameIdPlayerIdInput): Promise<WordSoupDto> {
    return apiRequest<WordSoupDto>(
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
