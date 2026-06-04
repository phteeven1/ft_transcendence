import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { GameGateway } from './game.gateway';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [PlayersModule],
  controllers: [GamesController],
  providers: [GamesService, GameGateway],
  exports: [GamesService, GameGateway],
})
export class GamesModule {}
