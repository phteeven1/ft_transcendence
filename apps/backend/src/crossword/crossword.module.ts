import { Module } from '@nestjs/common';
import { CrosswordController } from './crossword.controller';
import { CrosswordService } from './crossword.service';
import { VocabulariesModule } from '../vocabularies/vocabularies.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [VocabulariesModule, PrismaModule],
  controllers: [CrosswordController],
  providers: [CrosswordService],
  exports: [CrosswordService],
})
export class CrosswordModule {}
