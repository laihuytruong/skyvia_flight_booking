export interface OtpMail {
  to: string;
  code: string;
  expiresAt: Date;
}
