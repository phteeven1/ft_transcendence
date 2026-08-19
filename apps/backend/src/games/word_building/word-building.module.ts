import { Module, forwardRef } from '@nestjs/common';
import { WordBuildingController } from './word-building.controller';
import { WordBuildingService } from './word-building.service';
import { PlayersModule } from '../../players/players.module';

@Module({
  imports: [forwardRef(() => PlayersModule)],
  controllers: [WordBuildingController],
  providers: [WordBuildingService],
  exports: [WordBuildingService],
})
export class WordBuildingModule {}
