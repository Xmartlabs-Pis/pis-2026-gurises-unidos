import { expect, test } from '@playwright/test';
import { E2E_ADMIN } from '../prisma/e2e-fixtures';
import { MOBILE } from './helpers';

test.use({ viewport: MOBILE });

for (const { path, link } of [
  { path: '/management/metrics', link: 'Gestión de Métricas' },
  { path: '/dashboard', link: 'Gurises Unidos ONG Uruguay' },
  { path: '/management/profile', link: 'Mi perfil' },
]) {
  test(`closes the mobile sidebar when selecting the current ${path} page`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
    const sidebar = page.getByRole('dialog', { name: 'Sidebar', exact: true });
    await expect(sidebar).toBeVisible();
    await sidebar.getByRole('link', { name: link, exact: true }).click();
    await expect(sidebar).toBeHidden();
    await expect(page).toHaveURL(path);
  });
}

test('closes the mobile sidebar after navigating without pending changes', async ({ page }) => {
  await page.goto('/management/profile');
  await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
  const sidebar = page.getByRole('dialog', { name: 'Sidebar', exact: true });
  await sidebar.getByRole('link', { name: 'Proyectos', exact: true }).click();
  await expect(page).toHaveURL('/dashboard/projects');
  await expect(sidebar).toBeHidden();
});

for (const action of ['Seguir editando', 'Salir sin guardar', 'Guardar y salir']) {
  test(`handles ${action} without losing the mobile sidebar destination`, async ({ page }) => {
    await page.goto('/management/profile');
    const draftName = ` ${E2E_ADMIN.firstName} `;
    const name = page.getByRole('textbox', { name: 'Nombre', exact: true });
    await expect(async () => {
      await name.fill(draftName);
      await expect(name).toHaveValue(draftName, { timeout: 1000 });
      await expect(page.getByText('Cambios sin guardar', { exact: true })).toBeVisible({
        timeout: 1000,
      });
    }).toPass({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
    const sidebar = page.getByRole('dialog', { name: 'Sidebar', exact: true });
    await sidebar.getByRole('link', { name: 'Proyectos', exact: true }).click();
    const confirmation = page.getByRole('alertdialog');
    await expect(confirmation).toBeVisible();
    await expect(page).toHaveURL('/management/profile');
    await confirmation.getByRole('button', { name: action, exact: true }).click();

    if (action === 'Seguir editando') {
      await expect(confirmation).toBeHidden();
      await expect(page).toHaveURL('/management/profile');
      await sidebar.getByRole('button', { name: 'Cerrar menú' }).click();
      await expect(page.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue(
        draftName
      );
      await expect(page.getByText('Cambios sin guardar', { exact: true })).toBeVisible();
    } else {
      await expect(page).toHaveURL('/dashboard/projects');
      await expect(sidebar).toBeHidden();
    }
  });
}
