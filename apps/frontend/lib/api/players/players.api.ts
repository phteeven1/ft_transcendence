import { apiRequest } from '../http';
import type {
  ActivePlayerSessionDto,
  CreatePlayerInput,
  PlayerDto,
  RenamePlayerInput,
  StartSessionInput,
  StartSessionResult,
  ValidateSessionInput,
  ValidateSessionResult,
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

  findByGroup(groupId: number): Promise<PlayerDto[]> {
    return apiRequest<PlayerDto[]>(`/players/group/${groupId}`);
  },

  rename(input: RenamePlayerInput): Promise<PlayerDto> {
    return apiRequest<PlayerDto>('/players/rename', {
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

  clearSession(playerId: number, token?: string): Promise<void> {
    return apiRequest<void>('/players/clearSession', {
      method: 'POST',
      body: JSON.stringify({ playerId, token }),
    });
  },

  startSession(input: StartSessionInput): Promise<StartSessionResult> {
    return apiRequest<StartSessionResult>('/players/startSession', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  validateSession(input: ValidateSessionInput): Promise<ValidateSessionResult> {
    return apiRequest<ValidateSessionResult>('/players/validateSession', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getActiveSession(playerId: number): Promise<ActivePlayerSessionDto | null> {
    return apiRequest<ActivePlayerSessionDto | null>(
      `/players/${playerId}/activeSession`,
    );
  },
};
