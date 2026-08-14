import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { MailModule } from './mail/mail.module';
import { InvitationsModule } from './invitations/invitations.module';
import { PlayersModule } from './players/players.module';
import { VocabulariesModule } from './vocabularies/vocabularies.module';
import { GamesModule } from './games/games.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgressionModule } from './progression/progression.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    GroupsModule,
    MailModule,
    InvitationsModule,
    PlayersModule,
    VocabulariesModule,
    GamesModule,
    ProgressionModule,
  ],
})
export class AppModule {}
