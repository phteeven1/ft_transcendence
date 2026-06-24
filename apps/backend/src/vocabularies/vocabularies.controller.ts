import { Controller, Post, Get, Param, Body, UseInterceptors, UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
    @Body() body: {
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
  setActive(@Body() body: { vocabularyId: number; vocabularyInGroup: number }) {
    return this.vocabulariesService.setActive(body.vocabularyId, body.vocabularyInGroup);
  }

  @Post('rename')
  rename(@Body() body: { vocabularyId: number; vocabularyName: string }) {
    return this.vocabulariesService.rename(body.vocabularyId, body.vocabularyName);
  }

  @Post('update-entries')
  updateEntries(@Body() body: { vocabularyId: number; vocabularyWords: string[]; vocabularyMeanings: string[] }) {
    return this.vocabulariesService.updateEntries(body.vocabularyId, body.vocabularyWords, body.vocabularyMeanings);
  }

  @Post('remove')
  remove(@Body() body: { vocabularyId: number }) {
    return this.vocabulariesService.remove(body.vocabularyId);
  }

  @Get('group/:groupId')
  findByGroup(@Param('groupId') groupId: string) {
    return this.vocabulariesService.findByGroup(Number(groupId));
  }

	@Post('extract')
	@UseInterceptors(FileInterceptor('file'))
	async extract(
		@UploadedFile() file: Express.Multer.File,
		@Body() body: { fromLanguage?: string; toLanguage?: string }
	) {
		try {
			const fromLang = body.fromLanguage || 'fr';
			const toLang = body.toLanguage || 'en';
			console.log('Received file for extraction:', file.originalname, 'from:', fromLang, 'to:', toLang);
			return await this.extractionService.extractVocab(file, fromLang, toLang);
		} catch (error) {
			console.error('Extraction Error:', error); // This will show the real error in your terminal
			throw error;
		}
	}

	@Get(':id')
	findById(@Param('id') id: string) {
		return this.vocabulariesService.findById(Number(id));
	}

}
