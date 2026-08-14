import { Controller, Param, Post } from '@nestjs/common';
import { WordBuildingService } from './word-building.service';

@Controller('games')
export class WordBuildingController {
  constructor(private readonly wordBuildingService: WordBuildingService) {}

  /**
   * Builds the initial crossword for this game (or restores persisted state).
   *
   * @param id Game id from the route.
   * @returns trueCourt, visibleCourt, and clues.
   */
  @Post(':id/initWordBuildingCourt')
  initCourt(@Param('id') id: string) {
    return this.wordBuildingService.initCourt(Number(id));
  }
}
