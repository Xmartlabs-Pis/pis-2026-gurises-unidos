import { expect, test, type Page } from '@playwright/test';
import { E2E_ADMIN } from '../prisma/e2e-fixtures';
import { ADMIN_NAME, DESKTOP, MOBILE, lastAuditLogId, resetMetricSettings } from './helpers';

const ACTIONS = ['Seguir editando', 'Salir sin guardar', 'Guardar y salir'] as const;

async function selectFooterItem(page: Page, name: 'Mi perfil' | 'Cerrar sesión', mobile = false) {
  if (mobile) {
    await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
    const sidebar = page.getByRole('dialog', { name: 'Sidebar', exact: true });
    await sidebar
      .getByRole(name === 'Mi perfil' ? 'link' : 'button', { name, exact: true })
      .click();
  } else {
    await page.getByRole('button', { name: new RegExp(ADMIN_NAME) }).click();
    await page.getByRole('menuitem', { name, exact: true }).click();
  }
}

async function editProfile(page: Page, value = ` ${E2E_ADMIN.firstName} `) {
  await page.goto('/management/profile');
  const name = page.getByRole('textbox', { name: 'Nombre', exact: true });
  await expect(async () => {
    await name.fill(value);
    await expect(name).toHaveValue(value, { timeout: 1000 });
    await expect(page.getByText('Cambios sin guardar', { exact: true })).toBeVisible({
      timeout: 1000,
    });
  }).toPass({ timeout: 10_000 });
}

function metricSwitch(page: Page) {
  return page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Familias acompañadas', exact: true }) })
    .getByRole('switch');
}

async function editMetrics(page: Page) {
  await page.goto('/management/metrics');
  const metric = metricSwitch(page);
  await expect(metric).toBeVisible();
  const original = await metric.getAttribute('aria-checked');
  await expect(async () => {
    if ((await metric.getAttribute('aria-checked')) === original) await metric.click();
    await expect(page.getByText('Cambios sin guardar', { exact: true })).toBeVisible({
      timeout: 1000,
    });
  }).toPass({ timeout: 10_000 });
  return original;
}

for (const { label, viewport, mobile } of [
  { label: 'desktop', viewport: DESKTOP, mobile: false },
  { label: 'mobile', viewport: MOBILE, mobile: true },
]) {
  test.describe(`logout on ${label}`, () => {
    test.use({ viewport });

    test('logs out without confirmation when there are no changes', async ({ page }) => {
      await page.goto('/management/profile');
      await selectFooterItem(page, 'Cerrar sesión', mobile);
      await expect(page).toHaveURL('/');
      await page.goto('/management/profile');
      await expect(page).toHaveURL(/\/login/);
    });

    for (const action of ACTIONS) {
      test(`handles ${action} with pending changes`, async ({ page }) => {
        await editProfile(page);
        await selectFooterItem(page, 'Cerrar sesión', mobile);
        const confirmation = page.getByRole('alertdialog');
        await expect(confirmation).toBeVisible();
        await confirmation.getByRole('button', { name: action, exact: true }).click();

        if (action === 'Seguir editando') {
          await expect(confirmation).toBeHidden();
          await expect(page).toHaveURL('/management/profile');
          if (mobile) {
            const sidebar = page.getByRole('dialog', { name: 'Sidebar', exact: true });
            await sidebar.getByRole('link', { name: 'Proyectos', exact: true }).click();
          } else {
            await page.getByRole('link', { name: 'Proyectos', exact: true }).click();
          }
          await expect(confirmation).toBeVisible();
          await confirmation
            .getByRole('button', { name: 'Salir sin guardar', exact: true })
            .click();
          await expect(page).toHaveURL('/dashboard/projects');
        } else {
          await expect(page).toHaveURL('/');
          await page.goto('/management/profile');
          await expect(page).toHaveURL(/\/login/);
        }
      });
    }

    test('keeps the session and changes when saving fails validation', async ({ page }) => {
      await editProfile(page, '');
      await selectFooterItem(page, 'Cerrar sesión', mobile);
      const confirmation = page.getByRole('alertdialog');
      await expect(confirmation).toBeVisible();
      await confirmation.getByRole('button', { name: 'Guardar y salir', exact: true }).click();
      await expect(confirmation).toBeHidden();
      await expect(page).toHaveURL('/management/profile');
      if (mobile) {
        await page
          .getByRole('dialog', { name: 'Sidebar', exact: true })
          .getByRole('button', { name: 'Cerrar menú' })
          .click();
      }
      await expect(page.getByText('El nombre es obligatorio.', { exact: true })).toBeVisible();
      await expect(page.getByText('Cambios sin guardar', { exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('');
    });
  });
}

test.describe('desktop profile navigation', () => {
  test.use({ viewport: DESKTOP });
  let auditLogId: number;

  test.beforeEach(() => {
    auditLogId = lastAuditLogId();
  });

  test.afterEach(() => {
    resetMetricSettings(auditLogId);
  });

  test('navigates directly when there are no changes', async ({ page }) => {
    await page.goto('/management/metrics');
    await selectFooterItem(page, 'Mi perfil');
    await expect(page).toHaveURL('/management/profile');
    await expect(page.getByRole('alertdialog')).toBeHidden();
  });

  for (const action of ACTIONS) {
    test(`handles ${action} after the dropdown closes`, async ({ page }) => {
      const original = await editMetrics(page);
      await selectFooterItem(page, 'Mi perfil');
      const confirmation = page.getByRole('alertdialog');
      await expect(confirmation).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Mi perfil', exact: true })).toBeHidden();
      await confirmation.getByRole('button', { name: action, exact: true }).click();

      if (action === 'Seguir editando') {
        await expect(confirmation).toBeHidden();
        await expect(page).toHaveURL('/management/metrics');
        await expect(page.getByText('Cambios sin guardar', { exact: true })).toBeVisible();
        await expect(metricSwitch(page)).toHaveAttribute(
          'aria-checked',
          original === 'true' ? 'false' : 'true'
        );
      } else {
        await expect(page).toHaveURL('/management/profile');
        await page.goto('/management/metrics');
        await expect(metricSwitch(page)).toHaveAttribute(
          'aria-checked',
          action === 'Guardar y salir' ? (original === 'true' ? 'false' : 'true') : original!
        );
      }
    });
  }

  test('stays on metrics with pending changes when the save request fails', async ({ page }) => {
    await editMetrics(page);
    await page.route('**/management/metrics', async (route) => {
      if (route.request().method() === 'POST') await route.abort('failed');
      else await route.continue();
    });
    await selectFooterItem(page, 'Mi perfil');
    const confirmation = page.getByRole('alertdialog');
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: 'Guardar y salir', exact: true }).click();
    await expect(confirmation).toBeHidden();
    await expect(page).toHaveURL('/management/metrics');
    await expect(
      page.getByText('No se pudieron guardar los cambios. Intentá de nuevo.', {
        exact: true,
      })
    ).toBeVisible();
    await expect(page.getByText('Cambios sin guardar', { exact: true })).toBeVisible();
  });
});
