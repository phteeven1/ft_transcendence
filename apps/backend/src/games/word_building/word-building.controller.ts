import { Controller, Get, Param, Post } from '@nestjs/common';
import { WordBuildingService } from './word-building.service';

@Controller('games')
export class WordBuildingController {
  constructor(private readonly wordBuildingService: WordBuildingService) {}

  /**
   * Builds the initial crossword payload for the scaffold route.
   * The service creates the puzzle on first load and rehydrates persisted state on reconnect.
   *
   * @param id Route parameter carrying the game id.
   * @returns The initial trueCourt, visibleCourt, and clue metadata.
   */
  @Post(':id/initWordBuildingCourt')
  initCourt(@Param('id') id: string) {
    return this.wordBuildingService.initCourt(Number(id));
  }

  /**
   * Returns the current crossword state without rebuilding the puzzle.
   * This is used when a player reconnects mid-game.
   *
   * @param id Route parameter carrying the game id.
   * @returns The latest visible court payload.
   */
  @Get(':id/wordBuildingState')
  getState(@Param('id') id: string) {
    return this.wordBuildingService.getState(Number(id));
  }
}
