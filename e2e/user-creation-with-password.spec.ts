import { expect, test, type Page } from '@playwright/test';

import { DESKTOP, NO_SESSION, deleteUsers, hasActiveUserToken, login } from './helpers';

test.use({ viewport: DESKTOP });

const USER = {
  firstName: 'Paula',
  lastName: 'Provisoria',
  documentId: '65432127',
  email: 'e2e-temporary-password@gurisesunidos.test',
};
const TEMPORARY_PASSWORD = 'Temporary1';
const NEW_PASSWORD = 'ChosenPassword1';

test.afterEach(() => {
  deleteUsers([USER.documentId]);
});

async function fillProfile(page: Page) {
  await page.getByLabel('Nombre', { exact: true }).fill(USER.firstName);
  await page.getByLabel('Apellido').fill(USER.lastName);
  await page.getByLabel('Documento (Cédula)').fill(USER.documentId);
  await page.getByLabel('Correo electrónico').fill(USER.email);
}

async function chooseTemporaryPassword(page: Page) {
  await page.getByLabel('Método de creación').click();
  await page.getByRole('option', { name: 'Crear con contraseña temporal' }).click();
}

test('an admin creates a user with a temporary password that must be changed on first login', async ({
  page,
  browser,
}) => {
  await page.goto('/management/users/new');
  await expect(page.getByLabel('Contraseña temporal')).toBeHidden();
  await fillProfile(page);
  await chooseTemporaryPassword(page);
  await page.getByLabel('Contraseña temporal').fill(TEMPORARY_PASSWORD);
  await page.getByRole('button', { name: 'Guardar usuario' }).click();

  await expect(page).toHaveURL('/management/users');
  const row = page.getByRole('row').filter({ hasText: USER.email });
  await expect(row).toBeVisible();
  await expect(row.getByText('Activo')).toBeVisible();
  expect(hasActiveUserToken(USER.documentId, 'invitation')).toBe(false);

  const context = await browser.newContext({ storageState: NO_SESSION, viewport: DESKTOP });
  try {
    const guest = await context.newPage();

    await login(guest, USER.documentId, 'WrongPassword1');
    await expect(guest.getByText('Credenciales incorrectas')).toBeVisible();

    await login(guest, USER.documentId, TEMPORARY_PASSWORD);
    await expect(guest).toHaveURL('/password-reset');
    await expect(guest.getByText('Cambiá tu contraseña')).toBeVisible();

    await guest.goto('/dashboard');
    await expect(guest).toHaveURL('/password-reset');

    await guest.getByLabel('Nueva contraseña', { exact: true }).fill(NEW_PASSWORD);
    await guest.getByLabel('Confirmar nueva contraseña').fill(NEW_PASSWORD);
    await guest.getByRole('button', { name: 'Actualizar contraseña' }).click();
    await expect(guest).toHaveURL('/dashboard');
  } finally {
    await context.close();
  }

  const returning = await browser.newContext({ storageState: NO_SESSION, viewport: DESKTOP });
  try {
    const guest = await returning.newPage();

    await login(guest, USER.documentId, TEMPORARY_PASSWORD);
    await expect(guest.getByText('Credenciales incorrectas')).toBeVisible();

    await login(guest, USER.documentId, NEW_PASSWORD);
    await expect(guest).toHaveURL('/dashboard');
  } finally {
    await returning.close();
  }
});

test('generates a valid temporary password and creates the user with it', async ({
  page,
  browser,
}) => {
  await page.goto('/management/users/new');
  await fillProfile(page);
  await chooseTemporaryPassword(page);
  await page.getByRole('button', { name: 'Generar contraseña automáticamente' }).click();

  const generated = await page.getByLabel('Contraseña temporal').inputValue();
  expect(generated).toMatch(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8}$/);
  await page.getByRole('button', { name: 'Guardar usuario' }).click();
  await expect(page).toHaveURL('/management/users');

  const context = await browser.newContext({ storageState: NO_SESSION, viewport: DESKTOP });
  try {
    const guest = await context.newPage();
    await login(guest, USER.documentId, generated);
    await expect(guest).toHaveURL('/password-reset');
  } finally {
    await context.close();
  }
});

test('blocks the submission until the temporary password is valid', async ({ page }) => {
  await page.goto('/management/users/new');
  await fillProfile(page);
  await chooseTemporaryPassword(page);

  await page.getByRole('button', { name: 'Guardar usuario' }).click();
  await expect(page.getByText('La contraseña es obligatoria.')).toBeVisible();
  await expect(page).toHaveURL('/management/users/new');

  await page.getByLabel('Contraseña temporal').fill('weakpass');
  await expect(page.getByText('La contraseña debe tener al menos una mayúscula.')).toBeVisible();
  await expect(page).toHaveURL('/management/users/new');
});

test('keeps the invitation as the default creation method', async ({ page }) => {
  await page.goto('/management/users/new');

  await expect(page.getByLabel('Método de creación')).toContainText('Enviar invitación por correo');
  await expect(page.getByLabel('Contraseña temporal')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Guardar y enviar invitación' })).toBeVisible();

  await chooseTemporaryPassword(page);
  await expect(page.getByLabel('Contraseña temporal')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guardar usuario' })).toBeVisible();
});
