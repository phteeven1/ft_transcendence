import { Module } from '@nestjs/common';
import { VocabulariesController } from './vocabularies.controller';
import { VocabulariesService } from './vocabularies.service';
import { ExtractionService } from './extraction.service';

@Module({
  controllers: [VocabulariesController],
  providers: [VocabulariesService, ExtractionService],
  exports: [VocabulariesService, ExtractionService],
})
export class VocabulariesModule {}
