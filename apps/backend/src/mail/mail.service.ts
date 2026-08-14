import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly smtpConfigured =
    Boolean(process.env.MAIL_USER?.trim()) &&
    Boolean(process.env.MAIL_PASS?.trim());
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = this.smtpConfigured
      ? createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
          },
        })
      : createTransport({ jsonTransport: true });
  }

  async sendInvitation(
    toEmail: string,
    invitationText: string,
    groupName: string,
    inviteLink: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: `"Dictee" <${process.env.MAIL_FROM ?? 'no-reply@localhost'}>`,
      to: toEmail,
      subject: 'Invitation to Dictée vocabulary learning space',
      text: `${invitationText}\n\n${inviteLink}`,
      html: `
        <p>${invitationText.replace(/\n/g, '<br>')}</p>
        <br>
        <a href="${inviteLink}">Click here to join ${groupName}</a>
      `,
    });

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
