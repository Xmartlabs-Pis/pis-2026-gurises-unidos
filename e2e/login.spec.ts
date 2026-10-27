import { expect, test } from '@playwright/test';

import { E2E_ADMIN, E2E_COORDINATOR } from '../prisma/e2e-fixtures';
import { NO_SESSION, createActiveUser, deleteUsers, login, loginAs } from './helpers';

test.use({ storageState: NO_SESSION });

test('redirects unauthenticated users to login', async ({ page }) => {
  await page.goto('/management/users');

  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
});

test('rejects wrong credentials', async ({ page }) => {
  await login(page, E2E_ADMIN.documentId, 'not-the-seeded-password');

  await expect(page.getByText('Credenciales incorrectas')).toBeVisible();
  await expect(page).toHaveURL('/login');
});

test('blocks the sixth attempt even with the correct password after reloading', async ({
  page,
}) => {
  const documentId = '65432127';
  createActiveUser(documentId);

  try {
    for (let attempt = 1; attempt <= 5; attempt++) {
      await login(page, documentId, 'wrong-password');
      if (attempt < 5) {
        await expect(page.getByText('Credenciales incorrectas')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
      }
    }

    await expect(page.getByRole('status')).toContainText('Demasiados intentos');
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeDisabled();

    await login(page, documentId);

    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('status')).toContainText('Demasiados intentos');
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeDisabled();
    await expect(page.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toBeVisible();

    await page.getByLabel('Cédula').fill(E2E_ADMIN.documentId);
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
    await expect(page.getByRole('status')).toHaveCount(0);

    await page.getByLabel('Cédula').fill('6.543.212-7');
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeDisabled();
    await expect(page.getByRole('status')).toContainText('Demasiados intentos');
  } finally {
    deleteUsers([documentId]);
  }
});

test('rejects a malformed document id', async ({ page }) => {
  await login(page, '123');

  await expect(page.getByText(/Ingresá una cédula uruguaya válida/)).toBeVisible();
  await expect(page).toHaveURL('/login');
});

test('logs in as admin and lands on the dashboard', async ({ page }) => {
  await loginAs(page, E2E_ADMIN.documentId);

  await expect(page.getByRole('button', { name: 'Publicar dashboard' })).toBeVisible();
});

test('opens the dashboard from the sidebar logo', async ({ page }) => {
  await loginAs(page, E2E_ADMIN.documentId);
  await page.goto('/dashboard/projects');

  await page.getByRole('link', { name: 'Gurises Unidos' }).click();

  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('button', { name: 'Publicar dashboard' })).toBeVisible();
});

test('blocks non admin users from the users management page', async ({ page }) => {
  await loginAs(page, E2E_COORDINATOR.documentId);
  await page.goto('/management/users');

  await expect(page.getByRole('heading', { level: 1, name: 'Acceso denegado' })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
});

for (const path of [
  '/management/users/new',
  '/management/topics',
  '/management/beneficiary-categories',
  '/management/strategic-lines',
  '/management/metrics',
]) {
  test(`blocks non admin users from ${path}`, async ({ page }) => {
    await loginAs(page, E2E_COORDINATOR.documentId);
    const response = await page.goto(path);

    expect(response?.status()).toBe(403);
    await expect(page.getByRole('heading', { level: 1, name: 'Acceso denegado' })).toBeVisible();
  });
}

test('lets non admin users open their profile', async ({ page }) => {
  await loginAs(page, E2E_COORDINATOR.documentId);
  await page.goto('/management/profile');

  await expect(page.getByRole('heading', { level: 1, name: 'Mi perfil' })).toBeVisible();
});
