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
import { GameGateway } from '../games/game.gateway';

@Controller('vocabularies')
export class VocabulariesController {
  constructor(
    private readonly vocabulariesService: VocabulariesService,
    private readonly extractionService: ExtractionService,
    private readonly gateway: GameGateway,
  ) {}

  @Post('create')
  async create(
    @Body()
    body: {
      vocabularyInGroup: number;
      byUser: number;
      vocabularyName: string;
      vocabularyWords?: string[];
      vocabularyMeanings?: string[];
    },
  ) {
    const created = await this.vocabulariesService.create(
      body.vocabularyInGroup,
      body.byUser,
      body.vocabularyName,
      body.vocabularyWords ?? [],
      body.vocabularyMeanings ?? [],
    );
    if (created) this.gateway.emitDashboardUpdate(body.vocabularyInGroup);
    return created;
  }

  @Post('findOrCreate')
  async findOrCreate(
    @Body()
    body: {
      vocabularyInGroup: number;
      byUser: number;
      vocabularyName: string;
      vocabularyWords?: string[];
      vocabularyMeanings?: string[];
    },
  ) {
    const vocabulary = await this.vocabulariesService.findOrCreate(
      body.vocabularyInGroup,
      body.byUser,
      body.vocabularyName,
      body.vocabularyWords ?? [],
      body.vocabularyMeanings ?? [],
    );
    this.gateway.emitDashboardUpdate(body.vocabularyInGroup);
    return vocabulary;
  }

  @Post('setActive')
  async setActive(
    @Body()
    body: {
      vocabularyId: number;
      vocabularyInGroup: number;
    },
  ) {
    const updated = await this.vocabulariesService.setActive(
      body.vocabularyId,
      body.vocabularyInGroup,
    );
    if (updated) this.gateway.emitDashboardUpdate(body.vocabularyInGroup);
    return updated;
  }

  @Post('rename')
  async rename(
    @Body()
    body: {
      vocabularyId: number;
      vocabularyName: string;
      vocabularyInGroup: number;
    },
  ) {
    const renamed = await this.vocabulariesService.rename(
      body.vocabularyId,
      body.vocabularyName,
      body.vocabularyInGroup,
    );
    if (renamed) this.gateway.emitDashboardUpdate(body.vocabularyInGroup);
    return renamed;
  }

  @Post('update-entries')
  async updateEntries(
    @Body()
    body: {
      vocabularyId: number;
      vocabularyInGroup: number;
      vocabularyWords: string[];
      vocabularyMeanings: string[];
    },
  ) {
    const updated = await this.vocabulariesService.updateEntries(
      body.vocabularyId,
      body.vocabularyInGroup,
      body.vocabularyWords,
      body.vocabularyMeanings,
    );
    if (updated) this.gateway.emitDashboardUpdate(body.vocabularyInGroup);
    return updated;
  }

  @Post('remove')
  async remove(
    @Body()
    body: {
      vocabularyId: number;
      vocabularyInGroup: number;
    },
  ) {
    const removed = await this.vocabulariesService.remove(
      body.vocabularyId,
      body.vocabularyInGroup,
    );
    if (removed) this.gateway.emitDashboardUpdate(body.vocabularyInGroup);
    return removed;
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
    @Body()
    body: {
      fromLanguage?: string;
      toLanguage?: string;
      userId?: string;
      groupId?: string;
    },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    await this.vocabulariesService.assertGroupMembership(
      Number(body.userId),
      Number(body.groupId),
    );
    const fromLang = body.fromLanguage || 'French';
    const toLang = body.toLanguage || 'English';
    return this.extractionService.extractVocab(file, fromLang, toLang);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.vocabulariesService.findById(Number(id));
  }
}
