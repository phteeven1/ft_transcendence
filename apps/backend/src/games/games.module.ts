import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { GameGateway } from './game.gateway';
import { PlayersModule } from '../players/players.module';
import { WordBuildingModule } from './word_building/word-building.module';
import { WordSoupModule } from './word_soup/word-soup.module';

@Module({
  imports: [PlayersModule, WordBuildingModule, WordSoupModule],
  controllers: [GamesController],
  providers: [GamesService, GameGateway],
  exports: [GamesService, GameGateway],
})
export class GamesModule {}
