import { Module, forwardRef } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { GamesModule } from '../games/games.module';
import { UsersModule } from '../users/users.module';
import { PlayerSessionGuard } from './player-session.guard';

@Module({
  imports: [forwardRef(() => GamesModule), forwardRef(() => UsersModule)],
  controllers: [PlayersController],
  providers: [PlayersService, PlayerSessionGuard],
  exports: [PlayersService, PlayerSessionGuard],
})
export class PlayersModule {}
