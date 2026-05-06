import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { MailModule } from './mail/mail.module';
import { InvitationsModule } from './invitations/invitations.module';
import { PlayersModule } from './players/players.module';
import { VocabulariesModule } from './vocabularies/vocabularies.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    UsersModule,
    GroupsModule,
    MailModule,
    InvitationsModule,
    PlayersModule,
    VocabulariesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}