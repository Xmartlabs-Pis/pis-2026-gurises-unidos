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

const USER = { id: 42, firstName: 'Ana', email: 'ana@gmail.com' };
const INVITER_ID = 7;

function mockUsers(invitee: unknown, inviter: unknown) {
  findUniqueMock.mockImplementation(async ({ where }: { where: { id: number } }) => {
    if (where.id === USER.id) return invitee;
    if (where.id === INVITER_ID) return inviter;
    return null;
  });
}

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
    mockUsers({ role: 'coordinator' }, { firstName: 'María', lastName: 'Rodríguez' });

    await expect(sendInvitationEmail(USER, 'token-1', INVITER_ID)).resolves.toBe(true);

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
    mockUsers({ role: 'admin' }, null);

    await expect(sendInvitationEmail(USER, 'token-1', INVITER_ID)).resolves.toBe(true);

    expect(sendEmailMock.mock.calls[0][0].react.props).toMatchObject({
      invitedByName: 'un administrador',
      invitedByFirstName: 'un administrador',
      roleLabel: 'Administrador',
      expiresInDays: 7,
    });
  });

  test('does not send when the invitee no longer exists', async () => {
    mockUsers(null, { firstName: 'María', lastName: 'Rodríguez' });

    await expect(sendInvitationEmail(USER, 'token-1', INVITER_ID)).resolves.toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
