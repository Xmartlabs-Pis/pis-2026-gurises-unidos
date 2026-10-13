import { expect, test, type Page } from '@playwright/test';

import {
  E2E_ACTIVE_PROJECT,
  E2E_BENEFICIARY_YEAR,
  E2E_INACTIVE_PROJECT,
  E2E_DEPARTMENT,
  E2E_PROJECTS,
} from '../prisma/e2e-fixtures';
import { COORDINATOR_NAME, DESKTOP } from './helpers';

test.use({ viewport: DESKTOP });

const ALL_PROJECTS_URL = '/dashboard/projects?status=all&beneficiaryYear=all';

function projectCards(page: Page) {
  return page.getByRole('link').filter({ has: page.getByRole('heading', { level: 2 }) });
}

test('shows active projects of the latest year by default', async ({ page }) => {
  await page.goto('/dashboard/projects');

  await expect(page.getByRole('heading', { level: 1, name: 'Proyectos activos' })).toBeVisible();
  await page.getByRole('button', { name: 'Filtros de proyectos' }).click();
  await expect(page.getByRole('combobox', { name: 'Filtrar por año' })).toContainText(
    String(E2E_BENEFICIARY_YEAR)
  );

  const cards = projectCards(page);
  await expect(cards).toHaveCount(1);
  await expect(cards.getByRole('heading', { level: 2 })).toHaveText(E2E_ACTIVE_PROJECT.name);
});

test('lists the seeded projects', async ({ page }) => {
  await page.goto(ALL_PROJECTS_URL);

  await expect(
    page.getByRole('heading', { level: 1, name: 'Proyectos', exact: true })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nuevo proyecto' })).toBeVisible();

  const cards = projectCards(page);
  await expect(cards).toHaveCount(E2E_PROJECTS.length);

  const first = cards.first();
  await expect(first.getByRole('heading', { level: 2 })).toHaveText(E2E_ACTIVE_PROJECT.name);
  await expect(first).toHaveAttribute('href', /^\/dashboard\/projects\/\d+$/);
  await expect(first.getByText('Territorio')).toBeVisible();
  await expect(first.getByText(E2E_DEPARTMENT)).toBeVisible();
});

test('filters projects by status', async ({ page }) => {
  await page.goto(ALL_PROJECTS_URL);
  const tabs = page.getByRole('tablist', { name: 'Filtrar por estado' });
  const cards = projectCards(page);

  await tabs.getByRole('tab', { name: 'Activos', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Proyectos activos' })).toBeVisible();
  await expect(cards).toHaveCount(1);
  await expect(cards.getByRole('heading', { level: 2 })).toHaveText(E2E_ACTIVE_PROJECT.name);

  await tabs.getByRole('tab', { name: 'Inactivos' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Proyectos inactivos' })).toBeVisible();
  await expect(cards).toHaveCount(1);
  await expect(cards.getByRole('heading', { level: 2 })).toHaveText(E2E_INACTIVE_PROJECT.name);
});

test('searches projects by name', async ({ page }) => {
  await page.goto(ALL_PROJECTS_URL);

  await page.getByRole('textbox', { name: 'Buscar proyectos por nombre' }).fill('inactive');

  await expect(page).toHaveURL(/search=inactive/);
  const cards = projectCards(page);
  await expect(cards).toHaveCount(1);
  await expect(cards.getByRole('heading', { level: 2 })).toHaveText(E2E_INACTIVE_PROJECT.name);
});

test('shows the end year on a inactive project detail', async ({ page }) => {
  await page.goto('/dashboard/projects?status=inactive&beneficiaryYear=all');

  await projectCards(page).filter({ hasText: E2E_INACTIVE_PROJECT.name }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: E2E_INACTIVE_PROJECT.name })
  ).toBeVisible();
  await expect(
    page.getByText(`${E2E_INACTIVE_PROJECT.startYear}–${E2E_INACTIVE_PROJECT.endYear}`)
  ).toBeVisible();
});

test('opens the project detail from the list', async ({ page }) => {
  await page.goto('/dashboard/projects');

  await projectCards(page).filter({ hasText: E2E_ACTIVE_PROJECT.name }).click();

  await expect(page).toHaveURL(/\/dashboard\/projects\/\d+$/);
  await expect(
    page.getByRole('heading', { level: 1, name: E2E_ACTIVE_PROJECT.name })
  ).toBeVisible();
  await expect(page.getByText('Coordinador/a:')).toBeVisible();
  await expect(page.getByText(COORDINATOR_NAME)).toBeVisible();
});
