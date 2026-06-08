import { apiRequest } from '../http';
import type {
  CreatePlayerInput,
  PlayerDto,
  RenamePlayerInput,
  UpdatePassPhraseInput,
} from './types';

export const playersApi = {
  create(input: CreatePlayerInput): Promise<PlayerDto> {
    return apiRequest<PlayerDto>('/players/create', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getById(playerId: number): Promise<PlayerDto> {
    return apiRequest<PlayerDto>(`/players/${playerId}`);
  },

  findByParentInGroup(userId: number, groupId: number): Promise<PlayerDto[]> {
    return apiRequest<PlayerDto[]>(
      `/players/parent/${userId}/group/${groupId}`,
    );
  },

  rename(input: RenamePlayerInput): Promise<PlayerDto> {
    return apiRequest<PlayerDto>('/players/rename', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updatePassPhrase(input: UpdatePassPhraseInput): Promise<PlayerDto> {
    return apiRequest<PlayerDto>('/players/updatePassPhrase', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  remove(playerId: number): Promise<boolean> {
    return apiRequest<boolean>('/players/remove', {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    });
  },

  clearSession(playerId: number): Promise<void> {
    return apiRequest<void>('/players/clearSession', {
      method: 'POST',
      body: JSON.stringify({ playerId }),
    });
  },
};
