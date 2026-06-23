import { Module } from '@nestjs/common';
import { WordBuildingController } from './word-building.controller';
import { WordBuildingService } from './word-building.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WordBuildingController],
  providers: [WordBuildingService],
})
export class WordBuildingModule {}