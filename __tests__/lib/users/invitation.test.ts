import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { findUniqueMock, sendEmailMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: { user: { findUnique: findUniqueMock } },
}));
vi.mock('@/lib/email/client', () => ({ sendEmail: sendEmailMock }));

import { sendInvitationEmail } from '@/lib/users/invitation';

const USER = { id: 42, firstName: 'Ana', email: 'ana@gmail.com', role: 'coordinator' as const };
const INVITER_ID = 7;

beforeEach(() => {
  findUniqueMock.mockReset();
  sendEmailMock.mockReset();
  sendEmailMock.mockResolvedValue(true);
  vi.stubEnv('AUTH_URL', 'http://localhost:3000');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sendInvitationEmail', () => {
  test('names the current inviter and uses the invitee role', async () => {
    findUniqueMock.mockResolvedValue({ firstName: 'María', lastName: 'Rodríguez' });

    await expect(sendInvitationEmail(USER, 'token-1', INVITER_ID)).resolves.toBe(true);

    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: INVITER_ID },
      select: { firstName: true, lastName: true },
    });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const { to, react } = sendEmailMock.mock.calls[0][0];
    expect(to).toBe(USER.email);
    expect(react.props).toMatchObject({
      firstName: 'Ana',
      invitedByName: 'María Rodríguez',
      invitedByFirstName: 'María',
      roleLabel: 'Coordinador',
      invitationUrl: 'http://localhost:3000/accept-invitation?token=token-1',
      expiresInDays: 7,
    });
  });

  test('falls back to a generic inviter when the actor cannot be loaded', async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(
      sendInvitationEmail({ ...USER, role: 'admin' }, 'token-1', INVITER_ID)
    ).resolves.toBe(true);

    expect(sendEmailMock.mock.calls[0][0].react.props).toMatchObject({
      invitedByName: 'un administrador',
      invitedByFirstName: 'un administrador',
      roleLabel: 'Administrador',
      expiresInDays: 7,
    });
  });
});
