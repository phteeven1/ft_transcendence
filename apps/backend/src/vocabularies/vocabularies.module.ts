import { Module } from '@nestjs/common';
import { VocabulariesController } from './vocabularies.controller';
import { VocabulariesService } from './vocabularies.service';
import { ExtractionService } from './extraction.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  controllers: [VocabulariesController],
  providers: [VocabulariesService, ExtractionService],
  exports: [VocabulariesService, ExtractionService],
})
export class VocabulariesModule {}
