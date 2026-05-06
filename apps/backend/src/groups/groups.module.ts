import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { UsersModule } from '../users/users.module';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [UsersModule, PlayersModule],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}