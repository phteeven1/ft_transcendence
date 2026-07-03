import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { VocabulariesService } from './vocabularies.service';

@Controller('vocabularies')
export class VocabulariesController {
  constructor(private readonly vocabulariesService: VocabulariesService) {}

  @Post('create')
  create(
    @Body() body: {
      vocabularyInGroup:    number;
      byUser:               number;
      vocabularyName:       string;
      vocabularyWords?:     string[];
      vocabularyMeanings?:  string[];
    },
  ) {
    return this.vocabulariesService.create(
      body.vocabularyInGroup,
      body.byUser,
      body.vocabularyName,
      body.vocabularyWords   ?? [],
      body.vocabularyMeanings ?? [],
    );
  }

  @Post('setActive')
  setActive(
    @Body() body: {
      vocabularyId:      number;
      vocabularyInGroup: number;
      authorId:          number;
    },
  ) {
    return this.vocabulariesService.setActive(
      body.vocabularyId,
      body.vocabularyInGroup,
      body.authorId,
    );
  }

  @Post('rename')
  rename(
    @Body() body: {
      vocabularyId:      number;
      vocabularyName:    string;
      vocabularyInGroup: number;
      authorId:          number;
    },
  ) {
    return this.vocabulariesService.rename(
      body.vocabularyId,
      body.vocabularyName,
      body.vocabularyInGroup,
      body.authorId,
    );
  }

  @Post('update-entries')
  updateEntries(
    @Body() body: {
      vocabularyId:       number;
      vocabularyWords:    string[];
      vocabularyMeanings: string[];
    },
  ) {
    return this.vocabulariesService.updateEntries(
      body.vocabularyId,
      body.vocabularyWords,
      body.vocabularyMeanings,
    );
  }

  @Post('remove')
  remove(
    @Body() body: {
      vocabularyId:      number;
      vocabularyInGroup: number;
      authorId:          number;
    },
  ) {
    return this.vocabulariesService.remove(
      body.vocabularyId,
      body.vocabularyInGroup,
      body.authorId,
    );
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
