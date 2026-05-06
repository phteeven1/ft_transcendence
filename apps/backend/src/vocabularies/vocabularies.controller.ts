import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { VocabulariesService } from './vocabularies.service';

@Controller('vocabularies')
export class VocabulariesController {
  constructor(private readonly vocabulariesService: VocabulariesService) {}

  @Post('create')
  create(
    @Body() body: {
      vocabularyInGroup: number;
      vocabularyAuthor: number;
      vocabularyName: string;
      vocabularyWords?: string[];
      vocabularyMeanings?: string[];
    },
  ) {
    return this.vocabulariesService.create(
      body.vocabularyInGroup,
      body.vocabularyAuthor,
      body.vocabularyName,
      body.vocabularyWords ?? [],
      body.vocabularyMeanings ?? [],
    );
  }

  @Post('setActive')
  setActive(@Body() body: { vocabularyId: number; vocabularyInGroup: number }) {
    return this.vocabulariesService.setActive(body.vocabularyId, body.vocabularyInGroup);
  }

  @Post('rename')
  rename(@Body() body: { vocabularyId: number; vocabularyName: string }) {
    return this.vocabulariesService.rename(body.vocabularyId, body.vocabularyName);
  }

  @Post('remove')
  remove(@Body() body: { vocabularyId: number }) {
    return this.vocabulariesService.remove(body.vocabularyId);
  }

  @Get('group/:groupId')
  findByGroup(@Param('groupId') groupId: string) {
    return this.vocabulariesService.findByGroup(Number(groupId));
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.vocabulariesService.findById(Number(id));
  }
}