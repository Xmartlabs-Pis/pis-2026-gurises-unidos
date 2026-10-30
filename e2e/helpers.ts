import { expect, type Page } from '@playwright/test';

import { E2E_ADMIN, E2E_COORDINATOR } from '../prisma/e2e-fixtures';

export const ADMIN_NAME = `${E2E_ADMIN.firstName} ${E2E_ADMIN.lastName}`;
export const COORDINATOR_NAME = `${E2E_COORDINATOR.firstName} ${E2E_COORDINATOR.lastName}`;

export const DESKTOP = { width: 1440, height: 900 };
export const MOBILE = { width: 390, height: 844 };

export const NO_SESSION = { cookies: [], origins: [] };

export function seedPassword() {
  const password = process.env.SEED_USER_PASSWORD;
  if (!password) {
    throw new Error('SEED_USER_PASSWORD environment variable is required');
  }
  return password;
}

export async function login(page: Page, documentId: string, password = seedPassword()) {
  await page.goto('/login');
  await page.getByLabel('Cédula').fill(documentId);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

export async function loginAs(page: Page, documentId: string) {
  await login(page, documentId);
  await expect(page).toHaveURL('/dashboard');
}
