import { apiRequest } from '../../http';
import type { WordSoupDto } from './types';
import type { GameIdInput } from '../types';

export const wordSoupApi = {
  initCourt(input: GameIdInput): Promise<WordSoupDto> {
    return apiRequest<WordSoupDto>(
      `/games/${input.gameId}/initWordSoupCourt`,
      {
        method: 'POST',
      },
    );
  },
};
