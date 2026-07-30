import { getPlayerSession } from '@/lib/player-session';
import { apiRequest } from '../http';
import type {
  EquipAvatarInput,
  GroupStatsResponseDto,
  LeaderboardResponseDto,
  PlayerProgressionResponseDto,
} from './types';

function withPlayerSessionHeaders(
  options: RequestInit = {},
): RequestInit {
  const session = getPlayerSession();
  if (!session) return options;

  const headers = new Headers(options.headers);
  headers.set('X-Player-Id', String(session.playerId));
  headers.set('X-Player-Session-Token', session.token);
  return { ...options, headers };
}

export const progressionApi = {
  getLeaderboard(groupId: number): Promise<LeaderboardResponseDto> {
    return apiRequest<LeaderboardResponseDto>(
      `/groups/${groupId}/leaderboard`,
      withPlayerSessionHeaders(),
    );
  },

  getGroupStats(groupId: number): Promise<GroupStatsResponseDto> {
    return apiRequest<GroupStatsResponseDto>(
      `/groups/${groupId}/stats`,
      withPlayerSessionHeaders(),
    );
  },

  getMyProgression(): Promise<PlayerProgressionResponseDto> {
    return apiRequest<PlayerProgressionResponseDto>(
      '/players/me/progression',
      withPlayerSessionHeaders(),
    );
  },

  equipAvatar(input: EquipAvatarInput): Promise<PlayerProgressionResponseDto> {
    return apiRequest<PlayerProgressionResponseDto>(
      '/players/me/avatar',
      withPlayerSessionHeaders({
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    );
  },
};
