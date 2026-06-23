import { Module } from '@nestjs/common';
import { WordSoupController } from './word-soup.controller';
import { WordSoupService } from './word-soup.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WordSoupController],
  providers: [WordSoupService],
})
export class WordSoupModule {}