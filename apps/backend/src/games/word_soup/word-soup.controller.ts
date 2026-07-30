import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WordSoupService } from './word-soup.service';
import { WordSoupPlayerBodyDto } from './word-soup.dto';

@Controller('games')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class WordSoupController {
  constructor(private readonly wordSoupService: WordSoupService) {}

  @Post(':id/initWordSoupCourt')
  initCourt(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: WordSoupPlayerBodyDto,
  ) {
    return this.wordSoupService.initCourt(id, body.playerId);
  }

  @Post(':gameId/markWordSoupIntroShown')
  markIntroShown(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() body: WordSoupPlayerBodyDto,
  ) {
    return this.wordSoupService.markIntroShown(gameId, body.playerId);
  }
}
