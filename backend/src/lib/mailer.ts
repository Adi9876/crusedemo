import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter: nodemailer.Transporter;

if (env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    } : undefined,
  });
} else {
  // Local Development fallback: output mail to console
  transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const from = env.SMTP_FROM || 'noreply@crusex.com';
  
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    
    if (!env.SMTP_HOST) {
      console.log('==================================================');
      console.log('                  MAIL PREVIEW                    ');
      console.log('==================================================');
      console.log(`From:    ${from}`);
      console.log(`To:      ${to}`);
      console.log(`Subject: ${subject}`);
      console.log('--------------------------------------------------');
      console.log(info.message.toString());
      console.log('==================================================');
    }
  } catch (error) {
    console.error('[Mailer] Failed to send email:', error);
  }
}
