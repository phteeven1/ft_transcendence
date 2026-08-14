import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

export type Invitation = {
  token: string;
  groupId: number;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
};

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async sendInvitation(
    groupId: number,
    groupName: string,
    toEmail: string,
    invitationText: string,
    authorId: number,
  ): Promise<{ success: boolean }> {
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await this.prisma.invitation.create({
      data: { groupId, expiresAt },
    });

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const inviteLink = `${appUrl}/accept_invitation?token=${invitation.token}`;

    try {
      await this.mailService.sendInvitation(
        toEmail,
        invitationText,
        groupName,
        inviteLink,
      );
    } catch (error) {
      await this.prisma.invitation
        .delete({ where: { token: invitation.token } })
        .catch(() => undefined);

      const detail =
        error instanceof Error ? error.message : 'Unknown mail error';
      throw new ServiceUnavailableException(
        `Could not send invitation email. ${detail}`,
      );
    }

    void authorId;

    return { success: true };
  }

  async validateToken(
    token: string,
  ): Promise<{ valid: boolean; groupId?: number }> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });
    if (!invitation) return { valid: false };
    if (invitation.used) return { valid: false };
    if (new Date() > invitation.expiresAt) return { valid: false };
    return { valid: true, groupId: invitation.groupId };
  }

  async markAsUsed(token: string): Promise<void> {
    await this.prisma.invitation.updateMany({
      where: { token },
      data: { used: true },
    });
  }
}
