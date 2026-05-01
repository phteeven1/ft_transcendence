import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],  // needed so GroupsService can inject UsersService
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}