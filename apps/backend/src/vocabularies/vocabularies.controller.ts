import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { VocabulariesService } from './vocabularies.service';
import { ExtractionService } from './extraction.service';
import { GameGateway } from '../games/game.gateway';
import { UserSessionGuard } from '../users/user-session.guard';
import { AuthenticatedUserId } from '../users/authenticated-user.decorator';

@Controller('vocabularies')
export class VocabulariesController {
  constructor(
    private readonly vocabulariesService: VocabulariesService,
    private readonly extractionService: ExtractionService,
    private readonly gateway: GameGateway,
  ) {}

  @Post('create')
  @UseGuards(UserSessionGuard)
  async create(
    @AuthenticatedUserId() userId: number,
    @Body()
    body: {
      vocabularyInGroup: number;
      vocabularyName: string;
      vocabularyWords?: string[];
      vocabularyMeanings?: string[];
    },
  ) {
    await this.vocabulariesService.assertGroupMembership(
      userId,
      body.vocabularyInGroup,
    );
    const created = await this.vocabulariesService.create(
      body.vocabularyInGroup,
      userId,
      body.vocabularyName,
      body.vocabularyWords ?? [],
      body.vocabularyMeanings ?? [],
    );
    if (created) this.gateway.emitDashboardUpdate(body.vocabularyInGroup);
    return created;
  }

  @Post('findOrCreate')
  @UseGuards(UserSessionGuard)
  async findOrCreate(
    @AuthenticatedUserId() userId: number,
    @Body()
    body: {
      vocabularyInGroup: number;
      vocabularyName: string;
      vocabularyWords?: string[];
      vocabularyMeanings?: string[];
    },
  ) {
    await this.vocabulariesService.assertGroupMembership(
      userId,
      body.vocabularyInGroup,
    );
    const vocabulary = await this.vocabulariesService.findOrCreate(
      body.vocabularyInGroup,
      userId,
      body.vocabularyName,
      body.vocabularyWords ?? [],
      body.vocabularyMeanings ?? [],
    );
    this.gateway.emitDashboardUpdate(body.vocabularyInGroup);
    return vocabulary;
  }

  @Post('setActive')
  @UseGuards(UserSessionGuard)
  async setActive(
    @AuthenticatedUserId() userId: number,
    @Body()
    body: {
      vocabularyId: number;
      vocabularyInGroup: number;
    },
  ) {
    await this.vocabulariesService.assertGroupMembership(
      userId,
      body.vocabularyInGroup,
    );
    const updated = await this.vocabulariesService.setActive(
      body.vocabularyId,
      body.vocabularyInGroup,
    );
    if (updated) this.gateway.emitDashboardUpdate(body.vocabularyInGroup);
    return updated;
  }

  @Post('rename')
  @UseGuards(UserSessionGuard)
  async rename(
    @AuthenticatedUserId() userId: number,
    @Body()
    body: {
      vocabularyId: number;
      vocabularyName: string;
      vocabularyInGroup: number;
    },
  ) {
    await this.vocabulariesService.assertGroupMembership(
      userId,
      body.vocabularyInGroup,
    );
    const renamed = await this.vocabulariesService.rename(
      body.vocabularyId,
      body.vocabularyName,
      body.vocabularyInGroup,
    );
    if (renamed) this.gateway.emitDashboardUpdate(body.vocabularyInGroup);
    return renamed;
  }

  @Post('update-entries')
  @UseGuards(UserSessionGuard)
  async updateEntries(
    @AuthenticatedUserId() userId: number,
    @Body()
    body: {
      vocabularyId: number;
      vocabularyInGroup: number;
      vocabularyWords: string[];
      vocabularyMeanings: string[];
    },
  ) {
    await this.vocabulariesService.assertGroupMembership(
      userId,
      body.vocabularyInGroup,
    );
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
  @UseGuards(UserSessionGuard)
  async remove(
    @AuthenticatedUserId() userId: number,
    @Body()
    body: {
      vocabularyId: number;
      vocabularyInGroup: number;
    },
  ) {
    await this.vocabulariesService.assertGroupMembership(
      userId,
      body.vocabularyInGroup,
    );
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
  @HttpCode(HttpStatus.OK)
  @UseGuards(UserSessionGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async extract(
    @AuthenticatedUserId() userId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body()
    body: {
      fromLanguage?: string;
      toLanguage?: string;
      groupId?: string;
    },
  ) {
    if (!file) {
      return {
        success: false as const,
        code: 'EMPTY_FILE' as const,
      };
    }
    await this.vocabulariesService.assertGroupMembership(
      userId,
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
