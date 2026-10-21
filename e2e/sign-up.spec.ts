import { expect, test } from '@playwright/test';

import { DESKTOP, NO_SESSION, deleteUsers, issueUserToken, login } from './helpers';

test.use({ viewport: DESKTOP });

const INVITEE = {
  firstName: 'Ines',
  lastName: 'Invitada',
  documentId: '65432105',
  email: 'e2e-invitee@gurisesunidos.test',
};
const NEW_PASSWORD = 'InvitePassword1';

test.afterEach(() => {
  deleteUsers([INVITEE.documentId]);
});

test('an invited user completes the sign up and logs in', async ({ page, browser }) => {
  await page.goto('/management/users/new');
  await page.getByLabel('Nombre', { exact: true }).fill(INVITEE.firstName);
  await page.getByLabel('Apellido').fill(INVITEE.lastName);
  await page.getByLabel('Documento (Cédula)').fill(INVITEE.documentId);
  await page.getByLabel('Correo electrónico').fill(INVITEE.email);
  await page.getByRole('button', { name: 'Guardar y enviar invitación' }).click();

  await expect(page).toHaveURL('/management/users');
  await expect(page.getByRole('row').filter({ hasText: INVITEE.email })).toBeVisible();

  const { token, status } = issueUserToken(INVITEE.documentId, 'invitation');
  expect(status).toBe('pendingInvitation');

  const context = await browser.newContext({ storageState: NO_SESSION, viewport: DESKTOP });
  const guest = await context.newPage();
  await guest.goto(`/accept-invitation?token=${token}`);
  await expect(guest.getByText(`Hola, ${INVITEE.firstName}`)).toBeVisible();
  await guest.getByLabel('Nueva contraseña', { exact: true }).fill(NEW_PASSWORD);
  await guest.getByLabel('Confirmar nueva contraseña').fill(NEW_PASSWORD);
  await guest.getByRole('button', { name: 'Completar registro' }).click();

  await expect(guest).toHaveURL('/login?invitationAccepted=1');
  await login(guest, INVITEE.documentId, NEW_PASSWORD);
  await expect(guest).toHaveURL('/dashboard');
  await context.close();
});

test.describe('without a session', () => {
  test.use({ storageState: NO_SESSION });

  test('rejects an invalid invitation link', async ({ page }) => {
    await page.goto('/accept-invitation?token=not-a-real-token');

    await expect(page.getByText('Invitación no válida')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ir al inicio de sesión' })).toBeVisible();
  });
});
