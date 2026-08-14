import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { VocabulariesService } from './vocabularies.service';
import { ExtractionService } from './extraction.service';

@Controller('vocabularies')
export class VocabulariesController {
  constructor(
    private readonly vocabulariesService: VocabulariesService,
    private readonly extractionService: ExtractionService,
  ) {}

  @Post('create')
  create(
    @Body()
    body: {
      vocabularyInGroup: number;
      byUser: number;
      vocabularyName: string;
      vocabularyWords?: string[];
      vocabularyMeanings?: string[];
    },
  ) {
    return this.vocabulariesService.create(
      body.vocabularyInGroup,
      body.byUser,
      body.vocabularyName,
      body.vocabularyWords ?? [],
      body.vocabularyMeanings ?? [],
    );
  }

  @Post('setActive')
  setActive(
    @Body()
    body: {
      vocabularyId: number;
      vocabularyInGroup: number;
    },
  ) {
    return this.vocabulariesService.setActive(
      body.vocabularyId,
      body.vocabularyInGroup,
    );
  }

  @Post('rename')
  rename(
    @Body()
    body: {
      vocabularyId: number;
      vocabularyName: string;
      vocabularyInGroup: number;
    },
  ) {
    return this.vocabulariesService.rename(
      body.vocabularyId,
      body.vocabularyName,
      body.vocabularyInGroup,
    );
  }

  @Post('update-entries')
  updateEntries(
    @Body()
    body: {
      vocabularyId: number;
      vocabularyWords: string[];
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
    @Body()
    body: {
      vocabularyId: number;
      vocabularyInGroup: number;
    },
  ) {
    return this.vocabulariesService.remove(
      body.vocabularyId,
      body.vocabularyInGroup,
    );
  }

  @Get('group/:groupId')
  findByGroup(@Param('groupId') groupId: string) {
    return this.vocabulariesService.findByGroup(Number(groupId));
  }

  @Post('extract')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async extract(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { fromLanguage?: string; toLanguage?: string },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    const fromLang = body.fromLanguage || 'French';
    const toLang = body.toLanguage || 'English';
    console.log(
      'Received file for extraction:',
      file.originalname,
      file.mimetype,
      'from:',
      fromLang,
      'to:',
      toLang,
    );
    return this.extractionService.extractVocab(file, fromLang, toLang);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.vocabulariesService.findById(Number(id));
  }
}
