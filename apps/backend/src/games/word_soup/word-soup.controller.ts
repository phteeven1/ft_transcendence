import { Controller, Post, Param } from '@nestjs/common';
import { WordSoupService } from './word-soup.service';

@Controller('games')
export class WordSoupController {
  constructor(private readonly wordSoupService: WordSoupService) {}

  @Post(':id/initWordSoupCourt')
  initCourt(@Param('id') id: string) {
    return this.wordSoupService.initCourt(Number(id));
  }
}