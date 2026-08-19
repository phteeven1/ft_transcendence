import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { WordBuildingService } from './word-building.service';
import { PlayerSessionGuard } from '../../players/player-session.guard';
import { AuthenticatedPlayerId } from '../../players/authenticated-player.decorator';
import { PlayersService } from '../../players/players.service';

@Controller('games')
export class WordBuildingController {
  constructor(
    private readonly wordBuildingService: WordBuildingService,
    private readonly playersService: PlayersService,
  ) {}

  @Post(':id/initWordBuildingCourt')
  @UseGuards(PlayerSessionGuard)
  async initCourt(
    @AuthenticatedPlayerId() playerId: number,
    @Param('id') id: string,
  ) {
    await this.playersService.assertPlayerInGame(playerId, Number(id));
    return this.wordBuildingService.initCourt(Number(id));
  }
}
