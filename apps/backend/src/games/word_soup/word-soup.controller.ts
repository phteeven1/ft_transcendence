import { Controller, Post, Param, Body } from '@nestjs/common';
import { WordSoupService } from './word-soup.service';

type PlayerRequestBody = {
  playerId: number;
};

@Controller('games')
export class WordSoupController {
  constructor(private readonly wordSoupService: WordSoupService) {}

  @Post(':id/initWordSoupCourt')
  initCourt(@Param('id') id: string, @Body() body: PlayerRequestBody) {
    return this.wordSoupService.initCourt(Number(id), Number(body.playerId));
  }

  @Post(':gameId/markWordSoupIntroShown')
  markIntroShown(
    @Param('gameId') gameId: string,
    @Body() body: PlayerRequestBody,
  ) {
    return this.wordSoupService.markIntroShown(Number(gameId), Number(body.playerId));
  }
}
