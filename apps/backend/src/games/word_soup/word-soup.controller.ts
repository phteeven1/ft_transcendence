import {
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WordSoupService } from './word-soup.service';
import { PlayerSessionGuard } from '../../players/player-session.guard';
import { AuthenticatedPlayerId } from '../../players/authenticated-player.decorator';
import { PlayersService } from '../../players/players.service';

@Controller('games')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class WordSoupController {
  constructor(
    private readonly wordSoupService: WordSoupService,
    private readonly playersService: PlayersService,
  ) {}

  @Post(':id/initWordSoupCourt')
  @UseGuards(PlayerSessionGuard)
  async initCourt(
    @AuthenticatedPlayerId() playerId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.playersService.assertPlayerInGame(playerId, id);
    return this.wordSoupService.initCourt(id, playerId);
  }
}
