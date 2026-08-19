import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserSessionGuard } from './user-session.guard';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [forwardRef(() => GamesModule)],
  controllers: [UsersController],
  providers: [UsersService, UserSessionGuard],
  exports: [UsersService, UserSessionGuard],
})
export class UsersModule {}
