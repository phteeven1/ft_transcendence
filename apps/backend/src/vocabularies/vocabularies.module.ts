import { Module } from '@nestjs/common';
import { VocabulariesController } from './vocabularies.controller';
import { VocabulariesService } from './vocabularies.service';
import { ExtractionService } from './extraction.service';
import { GamesModule } from '../games/games.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [GamesModule, UsersModule],
  controllers: [VocabulariesController],
  providers: [VocabulariesService, ExtractionService],
  exports: [VocabulariesService, ExtractionService],
})
export class VocabulariesModule {}
