import { Controller, Post, Param } from '@nestjs/common';
import { WordBuildingService } from './word-building.service';

@Controller('games')
export class WordBuildingController {
  constructor(private readonly wordBuildingService: WordBuildingService) {}

  @Post(':id/initWordBuildingCourt')
  initCourt(@Param('id') id: string) {
    return this.wordBuildingService.initCourt(Number(id));
  }
}