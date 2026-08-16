import { apiRequest } from '../http';
import type {
  CreateGameInput,
  FinishGameResultDto,
  GameDto,
  GameFinishOutcomeDto,
  GameIdInput,
  GameIdPlayerIdInput,
  GameRosterPlayerDto,
} from './types';

export const gamesApi = {
  create(input: CreateGameInput): Promise<GameDto> {
    return apiRequest<GameDto>('/games/create', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getById(input: GameIdInput): Promise<GameDto> {
    return apiRequest<GameDto>(`/games/${input.gameId}`);
  },

  getPlayersForGame(gameId: number): Promise<GameRosterPlayerDto[]> {
    return apiRequest<GameRosterPlayerDto[]>(`/games/${gameId}/players`);
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

  finish(input: GameIdInput): Promise<FinishGameResultDto> {
    return apiRequest<FinishGameResultDto>('/games/finish', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getFinishOutcome(input: GameIdInput): Promise<GameFinishOutcomeDto | null> {
    return apiRequest<GameFinishOutcomeDto | null>(
      `/games/${input.gameId}/finish-outcome`,
    );
  },
};
