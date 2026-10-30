import { expect, test } from '@playwright/test';

import { BENEFICIARY_CATEGORIES } from '../prisma/fixtures';
import { DESKTOP } from './helpers';

test.use({ viewport: DESKTOP });

const CATEGORY_NAME = 'Docentes e2e';

test('lists the system categories without a delete action', async ({ page }) => {
  await page.goto('/management/beneficiary-categories');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Categorías de beneficiarios' })
  ).toBeVisible();
  await expect(page.getByText(`${BENEFICIARY_CATEGORIES.length} categorías`)).toBeVisible();
  for (const { name } of BENEFICIARY_CATEGORIES) {
    const row = page.getByRole('listitem').filter({ hasText: name });
    await expect(row.getByText('Sistema')).toBeVisible();
    await expect(row.getByRole('button', { name: 'Eliminar' })).toHaveCount(0);
  }
});

test('adds a category that shows up in the project form and deletes it', async ({ page }) => {
  await page.goto('/management/beneficiary-categories');

  await page.getByPlaceholder('Nueva categoría...').fill(CATEGORY_NAME);
  await page.getByRole('button', { name: 'Agregar' }).click();
  const row = page.getByRole('listitem').filter({ hasText: CATEGORY_NAME });
  await expect(row.getByText('0 proyectos')).toBeVisible();

  await page.goto('/dashboard/projects/new');
  await expect(page.getByRole('textbox', { name: CATEGORY_NAME })).toBeVisible();

  await page.goto('/management/beneficiary-categories');
  await row.getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByText(`${BENEFICIARY_CATEGORIES.length} categorías`)).toBeVisible();
  await expect(row).toHaveCount(0);

  await page.goto('/dashboard/projects/new');
  await expect(page.getByRole('textbox', { name: 'Familias' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: CATEGORY_NAME })).toHaveCount(0);
});
