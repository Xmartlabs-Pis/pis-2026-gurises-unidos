import { expect, test } from '@playwright/test';

import {
  NO_SESSION,
  createActiveUser,
  deleteUsers,
  hasActiveUserToken,
  issueUserToken,
  login,
  seedPassword,
} from './helpers';

test.use({ storageState: NO_SESSION });

const DOCUMENT_ID = '65432111';
const NEW_PASSWORD = 'ResetPassword1';

test.afterEach(() => {
  deleteUsers([DOCUMENT_ID]);
});

test('requests a reset link from the login page', async ({ page }) => {
  const user = createActiveUser(DOCUMENT_ID);
  await page.goto('/login');

  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page).toHaveURL('/forgot-password');
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByRole('button', { name: 'Enviar enlace' }).click();

  await expect(page.getByRole('status')).toContainText('Si el correo está registrado');
  await expect.poll(() => hasActiveUserToken(DOCUMENT_ID, 'passwordReset')).toBe(true);
});

test('resets the password with an emailed link and clears an active login cooldown', async ({
  page,
}) => {
  createActiveUser(DOCUMENT_ID);
  const { token } = issueUserToken(DOCUMENT_ID, 'passwordReset');

  for (let attempt = 1; attempt <= 5; attempt++) {
    await login(page, DOCUMENT_ID, 'wrong-password');
    if (attempt < 5) {
      await expect(page.getByText('Credenciales incorrectas')).toBeVisible();
    }
  }
  await expect(page.getByRole('status')).toContainText('Demasiados intentos');

  await page.goto(`/reset-password?token=${token}`);
  await page.getByLabel('Nueva contraseña', { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel('Confirmar nueva contraseña').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
  await expect(page).toHaveURL('/login?passwordChanged=1');

  await login(page, DOCUMENT_ID, seedPassword());
  await expect(page.getByText('Credenciales incorrectas')).toBeVisible();

  await login(page, DOCUMENT_ID, NEW_PASSWORD);
  await expect(page).toHaveURL('/dashboard');
});

test('rejects an invalid reset link', async ({ page }) => {
  await page.goto('/reset-password?token=not-a-real-token');

  await expect(page.getByText('Enlace no válido')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Pedir un enlace nuevo' })).toBeVisible();
});
