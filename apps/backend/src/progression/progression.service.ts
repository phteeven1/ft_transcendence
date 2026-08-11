import { Injectable } from '@nestjs/common';
import { ProgressionOutcomeService } from './progression-outcome.service';
import { ProgressionStatsService } from './progression-stats.service';
import type {
  GameFinishOutcome,
  GroupStatsResponse,
  LeaderboardResponse,
  PlayerProgressionResponse,
} from './progression.types';

/**
 * Facade over stats (leaderboard / player profile) and outcome (finish XP) services.
 * Callers keep injecting ProgressionService; internals stay focused.
 */
@Injectable()
export class ProgressionService {
  constructor(
    private readonly stats: ProgressionStatsService,
    private readonly outcomes: ProgressionOutcomeService,
  ) {}

  assertPlayerInGroup(playerId: number, groupId: number): Promise<void> {
    return this.stats.assertPlayerInGroup(playerId, groupId);
  }

  getLeaderboard(groupId: number): Promise<LeaderboardResponse> {
    return this.stats.getLeaderboard(groupId);
  }

  getGroupStats(groupId: number): Promise<GroupStatsResponse> {
    return this.stats.getGroupStats(groupId);
  }

  getMyProgression(playerId: number): Promise<PlayerProgressionResponse> {
    return this.stats.getMyProgression(playerId);
  }

  equipAvatar(
    playerId: number,
    input: { avatarAnimal: number },
  ): Promise<PlayerProgressionResponse> {
    return this.stats.equipAvatar(playerId, input);
  }

  getFinishOutcome(gameId: number): Promise<GameFinishOutcome | null> {
    return this.outcomes.getFinishOutcome(gameId);
  }

  recordGameOutcome(gameId: number): Promise<GameFinishOutcome | null> {
    return this.outcomes.recordGameOutcome(gameId);
  }
}
