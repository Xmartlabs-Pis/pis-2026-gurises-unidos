import { expect, test, type Page } from '@playwright/test';

import { DESKTOP, lastAuditLogId, resetMetricSettings } from './helpers';

test.use({ viewport: DESKTOP });

const HIDDEN_METRIC = 'Familias acompañadas';
const VISIBLE_METRIC = 'Proyectos con actividad';

let auditLogIdBeforeTest: number;

test.beforeEach(() => {
  auditLogIdBeforeTest = lastAuditLogId();
});

test.afterEach(() => {
  resetMetricSettings(auditLogIdBeforeTest);
});

function visibilitySwitch(page: Page, metric: string) {
  return page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: metric, exact: true }) })
    .getByRole('switch');
}

function publicStats(page: Page) {
  return page.getByRole('group', { name: /^Impacto \d{4}$/ });
}

test('shows and hides metrics on the public site', async ({ page }) => {
  await page.goto('/');
  await expect(publicStats(page)).toContainText(VISIBLE_METRIC);
  await expect(publicStats(page)).not.toContainText(HIDDEN_METRIC);

  await page.goto('/management/metrics');
  const preview = page.getByRole('complementary', { name: 'Vista previa del sitio público' });
  await visibilitySwitch(page, HIDDEN_METRIC).click();
  await visibilitySwitch(page, VISIBLE_METRIC).click();
  await expect(preview).toContainText(HIDDEN_METRIC);
  await expect(preview).not.toContainText(VISIBLE_METRIC);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cambios guardados.')).toBeVisible();

  await page.goto('/');
  await expect(publicStats(page)).toContainText(HIDDEN_METRIC);
  await expect(publicStats(page)).not.toContainText(VISIBLE_METRIC);
});
