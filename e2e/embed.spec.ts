import { expect, test, type Frame, type Locator, type Page } from '@playwright/test';

import { DESKTOP, NO_SESSION, lastAuditLogId, resetMetricSettings } from './helpers';

test.use({ viewport: DESKTOP });

const ALLOWED_HOST = 'http://localhost:4100';
const OTHER_HOST = 'http://localhost:4200';
const HIDDEN_METRIC = 'Familias acompañadas';
const OTHER_HIDDEN_METRIC = 'Instituciones vinculadas';
const VISIBLE_METRIC = 'Proyectos con actividad';

let auditLogIdBeforeTest: number;

test.beforeEach(() => {
  auditLogIdBeforeTest = lastAuditLogId();
});

test.afterEach(() => {
  resetMetricSettings(auditLogIdBeforeTest);
});

function stats(page: Page | Frame) {
  return page.getByRole('group', { name: /^Impacto \d{4}$/ });
}

async function statsPerRow(group: Locator) {
  const tops = await group
    .locator(':scope > div')
    .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)));
  return [...new Set(tops)].map((top) => tops.filter((itemTop) => itemTop === top).length);
}

async function setMetricVisibility(page: Page, changes: string[]) {
  await page.goto('/management/metrics');
  for (const metric of changes) {
    await page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: metric, exact: true }) })
      .getByRole('switch')
      .click();
  }
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cambios guardados.')).toBeVisible();
}

async function hostPage(page: Page, host: string, path: string) {
  const src = new URL(path, test.info().project.use.baseURL).href;
  await page.route(`${host}/`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html>
        <iframe id="embed" src="${src}" style="display: block; width: 100%; height: 1px; border: 0"></iframe>
        <script>
          window.addEventListener('message', function (event) {
            var iframe = document.getElementById('embed');
            if (event.source !== iframe.contentWindow) return;
            if (!event.data || event.data.type !== 'gurises-unidos:embed-height') return;
            iframe.style.height = event.data.height + 'px';
          });
        </script>`,
    })
  );
  await page.goto(`${host}/`);
  return page.locator('#embed');
}

async function expectFrameBlocked(page: Page) {
  await expect
    .poll(() =>
      page
        .frames()
        .find((frame) => frame !== page.mainFrame())
        ?.url()
    )
    .toBe('chrome-error://chromewebdata/');
}

test.describe('without a session', () => {
  test.use({ storageState: NO_SESSION, permissions: ['local-network-access'] });

  test('shows only the published impact metrics', async ({ page }) => {
    await page.goto('/embed');

    await expect(page.getByText(/^Nuestro impacto en \d{4}$/)).toBeVisible();
    await expect(stats(page)).toContainText(VISIBLE_METRIC);
    await expect(stats(page)).not.toContainText(HIDDEN_METRIC);
    await expect(page.getByText('Iniciar sesión')).toHaveCount(0);
    await expect(page.locator('a')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Ver informe completo' })).toHaveAttribute(
      'target',
      '_blank'
    );
  });

  test('shows the same metric values as the public site', async ({ page }) => {
    await page.goto('/');
    const publicValues = await stats(page)
      .locator(':scope > div > span:first-child')
      .allTextContents();

    await page.goto('/embed');
    await expect(stats(page).locator(':scope > div > span:first-child')).toHaveText(publicValues);
  });

  test('stacks two metrics per row on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/embed');

    expect(await statsPerRow(stats(page))).toEqual([2, 2]);
    const button = await page.getByRole('button', { name: 'Ver informe completo' }).boundingBox();
    const card = await stats(page).boundingBox();
    expect(button!.width).toBeCloseTo(card!.width, 0);
  });

  test('can be framed only by the allowed host', async ({ page }) => {
    const response = await page.request.get('/embed');
    expect(response.headers()['content-security-policy']).toBe(`frame-ancestors ${ALLOWED_HOST}`);

    const iframe = await hostPage(page, ALLOWED_HOST, '/embed');
    const embed = page.frameLocator('#embed');
    await expect(embed.getByText(/^Nuestro impacto en \d{4}$/)).toBeVisible();
    await expect
      .poll(() => iframe.evaluate((element) => element.getBoundingClientRect().height))
      .toBeGreaterThan(100);

    const [report] = await Promise.all([
      page.context().waitForEvent('page'),
      embed.getByRole('button', { name: 'Ver informe completo' }).click(),
    ]);
    await expect(report).toHaveURL(new URL('/', test.info().project.use.baseURL).href);
  });

  test('cannot be framed by another host', async ({ page }) => {
    await hostPage(page, OTHER_HOST, '/embed');
    await expectFrameBlocked(page);
  });

  test('blocks framing any other route', async ({ page }) => {
    for (const path of ['/', '/login']) {
      const response = await page.request.get(path);
      expect(response.headers()['content-security-policy']).toBe("frame-ancestors 'none'");
    }

    await hostPage(page, ALLOWED_HOST, '/login');
    await expectFrameBlocked(page);
  });
});

test('reflects the metrics the admin publishes', async ({ page }) => {
  await page.goto('/embed');
  expect(await statsPerRow(stats(page))).toEqual([4]);

  await setMetricVisibility(page, [VISIBLE_METRIC]);
  await page.goto('/embed');
  await expect(stats(page)).not.toContainText(VISIBLE_METRIC);
  expect(await statsPerRow(stats(page))).toEqual([3]);

  await setMetricVisibility(page, [HIDDEN_METRIC, OTHER_HIDDEN_METRIC, VISIBLE_METRIC]);
  await page.goto('/embed');
  await expect(stats(page)).toContainText(HIDDEN_METRIC);
  await expect(stats(page)).toContainText(OTHER_HIDDEN_METRIC);
  await expect(stats(page)).toContainText(VISIBLE_METRIC);
  expect(await statsPerRow(stats(page))).toEqual([3, 3]);
});
