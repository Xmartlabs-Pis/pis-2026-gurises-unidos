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

export async function sendEmail({ to, subject, react }: SendEmailInput) {
  if (!resend) {
    const body =
      process.env.NODE_ENV === 'production' ? '' : await render(react, { plainText: true });
    console.info(`[email] RESEND_API_KEY not set, email not sent to ${to}: ${subject}\n${body}`);
    return;
  }

  const { error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, react });
  if (error) {
    console.error(`[email] Error sending email to ${to}: ${error.message}`);
  }
}
