import { Module, forwardRef } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [forwardRef(() => GamesModule)],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService],
})
export class PlayersModule {}
