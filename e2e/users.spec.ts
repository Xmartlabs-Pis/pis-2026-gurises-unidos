import { expect, test } from '@playwright/test';

import { E2E_ADMIN, E2E_USERS } from '../prisma/e2e-fixtures';
import { ADMIN_NAME, DESKTOP, MOBILE } from './helpers';

const COLUMNS = ['Nombre', 'Correo electrónico', 'Rol', 'Estado', 'Último acceso'];

test.beforeEach(async ({ page }) => {
  await page.goto('/management/users');
});

test.describe('desktop', () => {
  test.use({ viewport: DESKTOP });

  test('lists the seeded users in the table', async ({ page }) => {
    for (const column of COLUMNS) {
      await expect(page.getByRole('columnheader', { name: column })).toBeVisible();
    }

    const table = page.getByRole('table');
    await expect(table.getByRole('row')).toHaveCount(E2E_USERS.length + 1);

    for (const user of E2E_USERS) {
      await expect(table.getByText(user.email)).toBeVisible();
    }
  });

  test('filters the table with the search box', async ({ page }) => {
    const search = page.getByPlaceholder('Buscar por nombre o correo...');
    const table = page.getByRole('table');

    await search.fill(ADMIN_NAME);
    await expect(table.getByRole('row')).toHaveCount(2);
    await expect(table.getByText(E2E_ADMIN.email)).toBeVisible();

    await search.fill('nobody matches this');
    await expect(table.getByRole('cell', { name: 'No se encontraron usuarios' })).toBeVisible();
  });

  test('links each row to its edit page', async ({ page }) => {
    await page.getByRole('button', { name: `Acciones para ${ADMIN_NAME}` }).click();

    const edit = page.getByRole('menuitem', { name: 'Editar' });
    await expect(edit).toHaveAttribute('href', /^\/management\/users\/\d+\/edit$/);
  });

  test('opens the new user form', async ({ page }) => {
    await page.getByRole('button', { name: '+ Nuevo usuario' }).click();

    await expect(page).toHaveURL('/management/users/new');
    await expect(page.getByRole('heading', { level: 1, name: 'Nuevo usuario' })).toBeVisible();
  });
});

test.describe('mobile', () => {
  test.use({ viewport: MOBILE });

  test('shows the full user card on small screens', async ({ page }) => {
    const card = page.locator('[data-slot="card"]').filter({ hasText: E2E_ADMIN.email });

    await expect(card).toBeVisible();
    await expect(card.getByText(ADMIN_NAME)).toBeVisible();
    await expect(card.getByText('Administrador')).toBeVisible();
    await expect(card.getByRole('button', { name: `Acciones para ${ADMIN_NAME}` })).toBeVisible();
    expect((await card.boundingBox())?.height).toBeGreaterThan(110);
  });
});
