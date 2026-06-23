import { Module } from '@nestjs/common';
import { WordBuildingController } from './word-building.controller';
import { WordBuildingService } from './word-building.service';

@Module({
  controllers: [WordBuildingController],
  providers:   [WordBuildingService],
  exports:     [WordBuildingService],   // exported so GameGateway can inject it
})
export class WordBuildingModule {}