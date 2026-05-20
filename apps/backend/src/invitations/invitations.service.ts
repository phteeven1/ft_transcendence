import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MailService } from '../mail/mail.service';

console.log('MAIL_USER:', process.env.MAIL_USER);
console.log('MAIL_PASS:', process.env.MAIL_PASS ? 'loaded' : 'MISSING');

export type Invitation = {
  token: string;
  groupId: number;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
};

@Injectable()
export class InvitationsService {
  private invitations: Invitation[] = [];

  constructor(private readonly mailService: MailService) {}

  async sendInvitation(
    groupId: number,
    groupName: string,
    toEmail: string,
    invitationText: string,
  ): Promise<{ success: boolean }> {
    const token = randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    this.invitations.push({
      token,
      groupId,
      createdAt,
      expiresAt,
      used: false,
    });

    const inviteLink = `${process.env.APP_URL}/accept_invitation?token=${token}`;

    await this.mailService.sendInvitation(
      toEmail,
      invitationText,
      groupName,
      inviteLink,
    );

    return { success: true };
  }

  validateToken(token: string): { valid: boolean; groupId?: number } {
    const invitation = this.invitations.find(i => i.token === token);
    if (!invitation) return { valid: false };
    if (invitation.used) return { valid: false };
    if (new Date() > invitation.expiresAt) return { valid: false };
    return { valid: true, groupId: invitation.groupId };
  }

  markAsUsed(token: string): void {
    const invitation = this.invitations.find(i => i.token === token);
    if (invitation) invitation.used = true;
  }
}