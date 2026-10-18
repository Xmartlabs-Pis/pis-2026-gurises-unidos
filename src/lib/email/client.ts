import type { ReactNode } from 'react';
import { Resend } from 'resend';
import { render } from 'react-email';

const EMAIL_FROM = process.env.EMAIL_FROM || 'Gurises Unidos <onboarding@resend.dev>';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

type SendEmailInput = {
  to: string;
  subject: string;
  react: ReactNode;
};

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

export async function sendEmail({ to, subject, react }: SendEmailInput) {
  const isProduction = process.env.NODE_ENV === 'production';
  const recipient = isProduction ? maskEmail(to) : to;

  if (!resend) {
    const body = isProduction ? '' : await render(react, { plainText: true });
    console.info(
      `[email] RESEND_API_KEY not set, email not sent to ${recipient}: ${subject}\n${body}`
    );
    return;
  }

  const { error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, react });
  if (error) {
    console.error(`[email] Error sending email to ${recipient}: ${error.message}`);
  }
}
