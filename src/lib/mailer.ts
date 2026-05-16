/**
 * Minimal email sender.
 * Uses nodemailer when SMTP_HOST is set, otherwise logs to stdout (dev mode).
 */

import { env } from "@/lib/env";

type MailOptions = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendMail(opts: MailOptions): Promise<void> {
  if (!env.SMTP_HOST) {
    // Dev fallback — print to stdout so developers can grab the link
    console.log(`\n[openradio:mailer] ─────────────────────────────────`);
    console.log(`  TO:      ${opts.to}`);
    console.log(`  SUBJECT: ${opts.subject}`);
    console.log(`  BODY:    ${opts.text}`);
    console.log(`[openradio:mailer] ─────────────────────────────────\n`);
    return;
  }

  // Dynamic import so nodemailer is only loaded when actually needed
  const nodemailer = await import("nodemailer");

  const transporter = nodemailer.default.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}
