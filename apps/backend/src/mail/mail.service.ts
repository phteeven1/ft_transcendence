import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendInvitation(
    toEmail: string,
    invitationText: string,
    groupName: string,
    inviteLink: string,
  ): Promise<void> {
    await this.mailerService.sendMail({
      to: toEmail,
      subject: 'Invitation to Dictée vocabulary learning space',
      text: `${invitationText}\n\n${inviteLink}`,
      html: `
        <p>${invitationText.replace(/\n/g, '<br>')}</p>
        <br>
        <a href="${inviteLink}">Click here to join ${groupName}</a>
      `,
    });
  }
}