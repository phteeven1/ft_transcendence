import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { GroupsService } from '../groups/groups.service';
import { UserSessionGuard } from '../users/user-session.guard';
import { AuthenticatedUserId } from '../users/authenticated-user.decorator';

@Controller('invitations')
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly groupsService: GroupsService,
  ) {}

  @Post('send')
  @UseGuards(UserSessionGuard)
  async send(
    @AuthenticatedUserId() userId: number,
    @Body()
    body: {
      groupId: number;
      groupName: string;
      toEmail: string;
      invitationText: string;
    },
  ) {
    await this.groupsService.assertMember(userId, body.groupId);
    return this.invitationsService.sendInvitation(
      body.groupId,
      body.groupName,
      body.toEmail,
      body.invitationText,
    );
  }

  @Get('validate/:token')
  validate(@Param('token') token: string) {
    return this.invitationsService.validateToken(token);
  }

  @Post('accept')
  async accept(@Body() body: { token: string }) {
    await this.invitationsService.markAsUsed(body.token);
    return { success: true };
  }
}
