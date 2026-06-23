import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';

const hasSmtpCredentials =
  Boolean(process.env.MAIL_USER?.trim()) &&
  Boolean(process.env.MAIL_PASS?.trim());

@Module({
  imports: [
    MailerModule.forRoot({
      transport: hasSmtpCredentials
        ? {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
              user: process.env.MAIL_USER,
              pass: process.env.MAIL_PASS,
            },
          }
        : { jsonTransport: true },
      defaults: {
        from: `"Dictee" <${process.env.MAIL_FROM ?? 'no-reply@localhost'}>`,
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
