import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'react-email';
import PasswordResetEmail from '@/emails/password-reset-email';
import UserInvitationEmail from '@/emails/user-invitation-email';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('email layout logo', () => {
  test('uses AUTH_URL for the invitation logo when sending', async () => {
    vi.stubEnv('AUTH_URL', 'https://app.example.com');
    vi.stubEnv('REACT_EMAIL_INTERNAL_PREVIEW_SERVER_LOCATION', '');

    const html = await render(
      UserInvitationEmail({
        firstName: 'Ana',
        invitedByName: 'María Rodríguez',
        invitedByFirstName: 'María',
        roleLabel: 'Coordinadora',
        invitationUrl: 'https://app.example.com/accept-invitation?token=example',
        expiresInDays: 7,
      })
    );

    expect(html).toContain('https://app.example.com/images/logo.png');
  });

  test('uses AUTH_URL for the password reset logo when sending', async () => {
    vi.stubEnv('AUTH_URL', 'https://app.example.com');
    vi.stubEnv('REACT_EMAIL_INTERNAL_PREVIEW_SERVER_LOCATION', '');

    const html = await render(
      PasswordResetEmail({
        firstName: 'Ana',
        resetUrl: 'https://app.example.com/reset-password?token=example',
        expiresInMinutes: 60,
      })
    );

    expect(html).toContain('https://app.example.com/images/logo.png');
  });
});
