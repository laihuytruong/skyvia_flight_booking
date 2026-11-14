import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { verificationEmailTemplate } from './templates/verification-email.template.js';

interface VerificationEmail {
  to: string;
  code: string;
  expiresAt: Date;
}

@Injectable()
export class MailService implements OnModuleDestroy {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const port = Number(config.get<string>('SMTP_PORT') ?? '465');

    this.from = config.getOrThrow<string>('MAIL_FROM');

    this.transporter = nodemailer.createTransport({
      host: config.getOrThrow<string>('SMTP_HOST'),
      port,
      secure: port === 465,
      auth: {
        user: config.getOrThrow<string>('SMTP_USER'),
        pass: config.getOrThrow<string>('SMTP_PASSWORD'),
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  async sendVerificationEmail(input: VerificationEmail): Promise<void> {
    const template = verificationEmailTemplate(input);

    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  onModuleDestroy(): void {
    this.transporter.close();
  }
}
