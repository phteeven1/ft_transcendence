import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('send')
  async send(
    @Body() body: {
      groupId:        number;
      groupName:      string;
      toEmail:        string;
      invitationText: string;
      authorId:       number;
    },
  ) {
    return this.invitationsService.sendInvitation(
      body.groupId,
      body.groupName,
      body.toEmail,
      body.invitationText,
      body.authorId,
    );
  }

  @Get('validate/:token')
  validate(@Param('token') token: string) {
    return this.invitationsService.validateToken(token);
  }

  @Post('accept')
  accept(@Body() body: { token: string }) {
    this.invitationsService.markAsUsed(body.token);
    return { success: true };
  }
}