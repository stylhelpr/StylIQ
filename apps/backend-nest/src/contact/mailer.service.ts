import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // true if port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async send(to: string, subject: string, text: string) {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"StylHelpr" <no-reply@stylhelpr.com>',
      to,
      subject,
      text,
    });
  }
}
