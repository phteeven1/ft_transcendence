import { apiRequest } from '../http';
import type {
  CreateGameInput,
  GameDto,
  GameIdInput,
  GameIdPlayerIdInput,
} from './types';

export const gamesApi = {
  create(input: CreateGameInput): Promise<GameDto> {
    return apiRequest<GameDto>('/games/create', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getById(gameId: number): Promise<GameDto> {
    return apiRequest<GameDto>(`/games/${gameId}`);
  },

  findByGroup(groupId: number): Promise<GameDto[]> {
    return apiRequest<GameDto[]>(`/games/group/${groupId}`);
  },

  join(input: GameIdPlayerIdInput): Promise<GameDto | null> {
    return apiRequest<GameDto | null>('/games/join', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  start(input: GameIdInput): Promise<GameDto> {
    return apiRequest<GameDto>('/games/start', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  leave(input: GameIdPlayerIdInput): Promise<GameDto | null> {
    return apiRequest<GameDto | null>('/games/leave', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  abandonPlay(input: GameIdPlayerIdInput): Promise<void> {
    return apiRequest<void>('/games/abandonPlay', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  finish(input: GameIdInput): Promise<GameDto> {
    return apiRequest<GameDto>('/games/finish', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  initWordBuildingCourt(gameId: number): Promise<{
    trueCourt: { char: string }[][];
    visibleCourt: { char: string }[][];
  }> {
    return apiRequest(`/games/${gameId}/initCourt`, { method: 'POST' });
  },
};
