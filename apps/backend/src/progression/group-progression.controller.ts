import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedPlayerId } from './authenticated-player.decorator';
import { PlayerSessionGuard } from './player-session.guard';
import { ProgressionService } from './progression.service';

@Controller('groups')
@UseGuards(PlayerSessionGuard)
export class GroupProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get(':groupId/leaderboard')
  async getLeaderboard(
    @Param('groupId', ParseIntPipe) groupId: number,
    @AuthenticatedPlayerId() playerId: number,
  ) {
    await this.progressionService.assertPlayerInGroup(playerId, groupId);
    return this.progressionService.getLeaderboard(groupId);
  }

  @Get(':groupId/stats')
  async getGroupStats(
    @Param('groupId', ParseIntPipe) groupId: number,
    @AuthenticatedPlayerId() playerId: number,
  ) {
    await this.progressionService.assertPlayerInGroup(playerId, groupId);
    return this.progressionService.getGroupStats(groupId);
  }
}
