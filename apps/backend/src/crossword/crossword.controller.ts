import { Body, Controller, Get, Param, Post, ParseIntPipe } from '@nestjs/common';
import { CrosswordService } from './crossword.service';
import type { CrosswordEntry, CrosswordUpdate } from './crossword.types';
import { IsNumber, IsOptional, IsArray, IsString, ValidateNested, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import type { WordDifficulty } from './words/crossword-words';

/**
 * crossword-logic Addition: DTO for crossword entry (word + clue)
 */
class CrosswordEntryDto implements CrosswordEntry {
  @IsString()
  answer!: string;

  @IsString()
  clue!: string;
}

/**
 * crossword-logic Addition: DTO for initializing crossword puzzle
 * Accepts game ID, optional custom entries, difficulty level, and regeneration flag
 */
class CrosswordInitDto {
  @IsNumber()
  gameId!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrosswordEntryDto)
  entries?: CrosswordEntryDto[];

  @IsOptional()
  @IsString()
  @IsIn(['easy', 'medium', 'hard'])
  difficulty?: WordDifficulty;

  @IsOptional()
  @IsBoolean()
  forceRegenerate?: boolean;
}

/**
 * crossword-logic Addition: DTO for updating single crossword cell
 * Validates row, column, and letter input
 */
class CrosswordUpdateDto implements CrosswordUpdate {
  @IsNumber()
  row!: number;

  @IsNumber()
  col!: number;

  @IsString()
  letter!: string;
}

/**
 * crossword-logic Addition: Crossword puzzle endpoints
 * Handles puzzle creation, retrieval, updates, and solution checking
 */
@Controller('crossword')
export class CrosswordController {
  constructor(private readonly crosswordService: CrosswordService) {}

  /**
   * crossword-logic Addition: Initialize new crossword puzzle
   * Accepts difficulty and optional custom word entries
   */
  @Post('init')
  init(@Body() body: CrosswordInitDto) {
    return this.crosswordService.init(
      body.gameId,
      body.entries,
      body.difficulty,
      body.forceRegenerate,
    );
  }

  /**
   * crossword-logic Addition: Retrieve existing puzzle (without solution)
   */
  @Get(':gameId')
  get(@Param('gameId', ParseIntPipe) gameId: number) {
    return this.crosswordService.get(gameId);
  }

  /**
   * crossword-logic Addition: Update single cell with player's letter
   */
  @Post(':gameId/cell')
  update(
    @Param('gameId', ParseIntPipe) gameId: number,
    @Body() body: CrosswordUpdateDto,
  ) {
    return this.crosswordService.update(gameId, body);
  }

  /**
   * crossword-logic Addition: Check player's solution and return wrong cells
   */
  @Get(':gameId/check')
  check(@Param('gameId', ParseIntPipe) gameId: number) {
    return this.crosswordService.check(gameId);
  }
}
