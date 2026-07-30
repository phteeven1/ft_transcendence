import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly smtpConfigured =
    Boolean(process.env.MAIL_USER?.trim()) &&
    Boolean(process.env.MAIL_PASS?.trim());

  constructor(private readonly mailerService: MailerService) {}

  async sendInvitation(
    toEmail: string,
    invitationText: string,
    groupName: string,
    inviteLink: string,
  ): Promise<void> {
    const payload = {
      to: toEmail,
      subject: 'Invitation to Dictée vocabulary learning space',
      text: `${invitationText}\n\n${inviteLink}`,
      html: `
        <p>${invitationText.replace(/\n/g, '<br>')}</p>
        <br>
        <a href="${inviteLink}">Click here to join ${groupName}</a>
      `,
    };

    await this.mailerService.sendMail(payload);

    if (!this.smtpConfigured) {
      this.logger.warn(
        `MAIL_USER/MAIL_PASS not set — invitation logged locally instead of sent via SMTP.`,
      );
      this.logger.log(
        `Dev invitation to ${toEmail} for "${groupName}": ${inviteLink}`,
      );
    }
  }
}
