import { expect, test } from '@playwright/test';
import { E2E_COORDINATOR } from '../prisma/e2e-fixtures';
import { DESKTOP, MOBILE, NO_SESSION, deleteUsers, login, loginAs } from './helpers';

const DOCUMENT_ID = '65432105';

for (const [layout, viewport] of [
  ['desktop', DESKTOP],
  ['mobile', MOBILE],
] as const) {
  test(`shows and filters failed logins in the history on ${layout}`, async ({
    page,
    browser,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    const anonymousContext = await browser.newContext({ storageState: NO_SESSION });
    try {
      const anonymousPage = await anonymousContext.newPage();
      await login(anonymousPage, DOCUMENT_ID, 'wrong-password');
      await expect(anonymousPage.getByText('Credenciales incorrectas')).toBeVisible();

      await page.goto('/management/history');
      await expect(page.getByRole('heading', { name: 'Historial de cambios' })).toBeVisible();
      await page.getByRole('tab', { name: 'Accesos fallidos' }).click();
      await expect(page).toHaveURL(/action=loginFailure/);
      await page.getByRole('button', { name: /Filtros/ }).click();
      await page.getByLabel('Cédula ingresada', { exact: true }).fill('6.543.210-5');
      await page.getByLabel('Cédula ingresada', { exact: true }).press('Enter');
      await expect(page).toHaveURL(/documentId=65432105/);
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-slot="popover-content"]')).toBeHidden();

      await expect(
        page.locator('p:visible').filter({ hasText: `Cédula ingresada: ${DOCUMENT_ID}` })
      ).toHaveCount(1);
      await expect(
        page.getByText('Sin autenticar', { exact: true }).filter({ visible: true })
      ).toHaveCount(1);
      await expect(
        page.getByText('Autenticación fallida', { exact: true }).filter({ visible: true })
      ).toHaveCount(1);
      await expect(page.locator('time:visible')).toContainText(/\d{2}:\d{2}:\d{2}/);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${layout}-audit-history.png`),
        fullPage: true,
      });

      await page.getByRole('tab', { name: 'Todas', exact: true }).click();
      await expect(page).not.toHaveURL(/action=/);
      await expect(
        page.locator('p:visible').filter({ hasText: `Cédula ingresada: ${DOCUMENT_ID}` })
      ).toHaveCount(1);
      await page.getByRole('tab', { name: 'Creaciones', exact: true }).click();
      await expect(
        page
          .getByText('No hay registros con estos filtros', { exact: true })
          .filter({ visible: true })
      ).toBeVisible();
    } finally {
      await anonymousContext.close();
      deleteUsers([DOCUMENT_ID]);
    }
  });
}

test('keeps the history restricted to administrators', async ({ browser }) => {
  const context = await browser.newContext({ storageState: NO_SESSION });
  try {
    const page = await context.newPage();
    await page.goto('/management/history?action=loginFailure');
    await expect(page).toHaveURL('/login');
    await loginAs(page, E2E_COORDINATOR.documentId);
    const response = await page.goto('/management/history?action=loginFailure');
    expect(response?.status()).toBe(403);
    await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
    await expect(page.getByRole('table')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
