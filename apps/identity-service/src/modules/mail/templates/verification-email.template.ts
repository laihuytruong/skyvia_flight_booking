interface VerificationEmailTemplateInput {
  code: string;
  expiresAt: Date;
}

export function verificationEmailTemplate({
  code,
  expiresAt,
}: VerificationEmailTemplateInput): {
  subject: string;
  text: string;
  html: string;
} {
  if (!/^\d{6}$/.test(code)) {
    throw new Error('Verification code must contain exactly 6 digits');
  }

  const remainingMs = expiresAt.getTime() - Date.now();

  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    throw new Error('Verification code has expired');
  }

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const duration =
    remainingSeconds >= 60
      ? Math.ceil(remainingSeconds / 60)
      : remainingSeconds;
  const unit = remainingSeconds >= 60 ? 'minute' : 'second';
  const validity = `${duration} ${unit}${duration === 1 ? '' : 's'}`;

  const year = new Date().getFullYear();

  return {
    subject: 'Skyvia — Verify your email address',

    text: [
      'SKYVIA',
      'Every journey starts here.',
      '',
      'Verify your email address',
      '',
      'Thank you for choosing Skyvia.',
      'Enter the code below on the verification screen to complete your registration.',
      '',
      `Your verification code: ${code}`,
      `This code is valid for ${validity}.`,
      '',
      'If your code has expired, select Resend code on the verification screen to receive a new one.',
      '',
      'Keep your code private. Do not share it with anyone.',
      'If you did not create a Skyvia account, you can safely ignore this email.',
      '',
      'See you on your next journey,',
      'The Skyvia Team',
      '',
      `© ${year} Skyvia.`,
    ].join('\n'),

    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <title>Verify your Skyvia email</title>
</head>

<body style="margin:0;padding:0;background-color:#f1f5f9;
  font-family:Arial,Helvetica,sans-serif;color:#0f172a;
  -webkit-text-size-adjust:100%;">

  <div style="display:none;font-size:1px;line-height:1px;
    max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    Verify your email to start your journey with Skyvia.
  </div>

  <table role="presentation" width="100%" cellspacing="0"
    cellpadding="0" border="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" width="100%" cellspacing="0"
          cellpadding="0" border="0" style="max-width:560px;">

          <!-- Brand -->
          <tr>
            <td style="padding:0 8px 24px;">
              <table role="presentation" width="100%" cellspacing="0"
                cellpadding="0" border="0">
                <tr>
                  <td style="font-size:27px;font-weight:800;
                    letter-spacing:3px;color:#0f172a;">
                    SKY<span style="color:#0284c7;">VIA</span>
                  </td>
                  <td align="right" style="font-size:11px;
                    font-weight:700;letter-spacing:1px;color:#64748b;">
                    READY FOR TAKEOFF
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email card -->
          <tr>
            <td style="background-color:#ffffff;
              border:1px solid #e2e8f0;border-radius:20px;
              overflow:hidden;">

              <table role="presentation" width="100%" cellspacing="0"
                cellpadding="0" border="0">

                <tr>
                  <td style="height:5px;line-height:5px;
                    font-size:1px;background-color:#0ea5e9;">&nbsp;</td>
                </tr>

                <!-- Header -->
                <tr>
                  <td style="padding:32px 28px;background-color:#0f172a;">
                    <p style="margin:0 0 14px;font-size:11px;
                      font-weight:700;letter-spacing:2px;color:#7dd3fc;">
                      WELCOME TO SKYVIA
                    </p>

                    <h1 style="margin:0;font-size:28px;line-height:1.35;
                      font-weight:700;color:#ffffff;">
                      One more step.<br />
                      Your journey awaits.
                    </h1>

                    <p style="margin:14px 0 0;font-size:14px;
                      line-height:1.7;color:#cbd5e1;">
                      Verify your email to complete your registration.
                    </p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding:30px 28px 32px;">
                    <h2 style="margin:0 0 12px;font-size:20px;
                      line-height:1.4;color:#0f172a;">
                      Verify your email address
                    </h2>

                    <p style="margin:0;font-size:15px;
                      line-height:1.8;color:#475569;">
                      Thank you for choosing Skyvia. Enter the code
                      below on the verification screen to finish
                      setting up your account.
                    </p>

                    <!-- Verification code -->
                    <table role="presentation" width="100%"
                      cellspacing="0" cellpadding="0" border="0"
                      style="margin-top:24px;">
                      <tr>
                        <td align="center"
                          style="padding:24px 12px;
                            background-color:#f0f9ff;
                            border:1px solid #bae6fd;
                            border-radius:14px;">
                          <p style="margin:0 0 14px;font-size:11px;
                            font-weight:700;letter-spacing:2px;
                            color:#0369a1;">
                            YOUR VERIFICATION CODE
                          </p>

                          <p dir="ltr" style="margin:0;
                            font-family:'Courier New',monospace;
                            font-size:36px;font-weight:700;
                            line-height:1.3;letter-spacing:6px;
                            color:#0f172a;">${code}</p>

                          <p style="margin:14px 0 0;font-size:12px;
                            line-height:1.7;color:#64748b;">
                            This code is valid for
                            <strong style="color:#334155;">
                              ${validity}
                            </strong>.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:20px 0 0;font-size:13px;
                      line-height:1.8;color:#64748b;">
                      If your code has expired, select
                      <strong style="color:#334155;">Resend code</strong>
                      on the verification screen to receive a new one.
                    </p>

                    <!-- Security note -->
                    <table role="presentation" width="100%"
                      cellspacing="0" cellpadding="0" border="0"
                      style="margin-top:24px;">
                      <tr>
                        <td style="padding:16px;
                          background-color:#f8fafc;
                          border-left:3px solid #0ea5e9;
                          border-radius:4px;">
                          <p style="margin:0 0 5px;font-size:13px;
                            font-weight:700;color:#334155;">
                            Keep your code private
                          </p>
                          <p style="margin:0;font-size:12px;
                            line-height:1.8;color:#64748b;">
                            Do not share this code with anyone.
                            If you did not create a Skyvia account,
                            you can safely ignore this email.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Sign-off -->
                <tr>
                  <td style="padding:18px 28px;
                    border-top:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:12px;
                      line-height:1.7;color:#64748b;">
                      See you on your next journey,<br />
                      <strong style="color:#0f172a;">The Skyvia Team</strong>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 12px 0;">
              <p style="margin:0;font-size:12px;
                line-height:1.8;color:#64748b;">
                SKYVIA · Every journey starts here.
              </p>
              <p style="margin:8px 0 0;font-size:11px;
                line-height:1.8;color:#64748b;">
                &copy; ${year} Skyvia.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
}
