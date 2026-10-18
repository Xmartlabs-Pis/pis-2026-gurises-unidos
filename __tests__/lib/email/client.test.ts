import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));
vi.mock('react-email', () => ({
  render: vi.fn(async () => 'Plain text body with https://example.com/reset'),
}));

async function loadSendEmail() {
  vi.resetModules();
  const { sendEmail } = await import('@/lib/email/client');
  return sendEmail;
}

const EMAIL = {
  to: 'ana.perez@example.com',
  subject: 'Restablecé tu contraseña',
  react: createElement('p', null, 'body'),
};

let consoleInfo: ReturnType<typeof vi.spyOn>;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sendMock.mockReset();
  consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('sendEmail without RESEND_API_KEY', () => {
  test('prints the recipient and the body outside production', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'development');
    const sendEmail = await loadSendEmail();

    await sendEmail(EMAIL);

    const message = String(consoleInfo.mock.calls[0][0]);
    expect(message).toContain('ana.perez@example.com');
    expect(message).toContain('https://example.com/reset');
    expect(sendMock).not.toHaveBeenCalled();
  });

  test('masks the recipient and omits the body in production', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'production');
    const sendEmail = await loadSendEmail();

    await sendEmail(EMAIL);

    const message = String(consoleInfo.mock.calls[0][0]);
    expect(message).toContain('a***@example.com');
    expect(message).not.toContain('ana.perez');
    expect(message).not.toContain('https://example.com/reset');
  });
});

describe('sendEmail with RESEND_API_KEY', () => {
  test('sends the email through Resend', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('EMAIL_FROM', 'Test <test@example.com>');
    sendMock.mockResolvedValue({ error: null });
    const sendEmail = await loadSendEmail();

    await sendEmail(EMAIL);

    expect(sendMock).toHaveBeenCalledWith({ from: 'Test <test@example.com>', ...EMAIL });
    expect(consoleError).not.toHaveBeenCalled();
  });

  test('logs a masked recipient in production when Resend returns an error', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('NODE_ENV', 'production');
    sendMock.mockResolvedValue({ error: { message: 'domain not verified' } });
    const sendEmail = await loadSendEmail();

    await expect(sendEmail(EMAIL)).resolves.toBeUndefined();

    const message = String(consoleError.mock.calls[0][0]);
    expect(message).toContain('a***@example.com');
    expect(message).toContain('domain not verified');
    expect(message).not.toContain('ana.perez');
  });
});
