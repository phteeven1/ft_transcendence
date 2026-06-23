import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { MailModule } from '../mail/mail.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [MailModule, ChatModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule {}