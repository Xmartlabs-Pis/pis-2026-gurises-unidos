import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';

import { E2E_ADMIN, E2E_COORDINATOR, E2E_TOPICS, E2E_DEPARTMENT } from '../prisma/e2e-fixtures';
import { STRATEGIC_LINES } from '../prisma/fixtures';
import type { E2eDbCommands } from '../prisma/e2e-db';

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

function e2eDb<K extends keyof E2eDbCommands>(
  command: K,
  ...args: Parameters<E2eDbCommands[K]>
): Awaited<ReturnType<E2eDbCommands[K]>> {
  const output = execFileSync(process.execPath, ['--import', 'tsx', 'prisma/e2e-db.ts'], {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, E2E_DB_COMMAND: JSON.stringify([command, ...args]) },
    encoding: 'utf8',
  });
  return JSON.parse(output.trim().split('\n').at(-1)!);
}

export function createActiveUser(documentId: string) {
  return e2eDb('createActiveUser', documentId);
}

export function hasActiveUserToken(documentId: string, type: 'invitation' | 'passwordReset') {
  return e2eDb('hasActiveUserToken', documentId, type);
}

export function issueUserToken(documentId: string, type: 'invitation' | 'passwordReset') {
  return e2eDb('issueUserToken', documentId, type);
}

export function deleteUsers(documentIds: string[]) {
  e2eDb('deleteUsers', documentIds);
}

export function deleteProjects(names: string[]) {
  e2eDb('deleteProjects', names);
}

export function deleteBeneficiaryCategories(names: string[]) {
  e2eDb('deleteBeneficiaryCategories', names);
}

export function resetMetricSettings() {
  e2eDb('resetMetricSettings');
}

async function pickOption(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await page.keyboard.press('Escape');
}

export async function fillRequiredProjectFields(page: Page, name: string) {
  await page.getByLabel('Nombre del proyecto').fill(name);
  await pickOption(page, 'Temáticas', E2E_TOPICS[0]);
  await pickOption(page, 'Contraparte', 'Sector Público');
  await pickOption(page, 'Coordinador responsable', COORDINATOR_NAME);
  await pickOption(page, 'Líneas estratégicas', STRATEGIC_LINES[0]);
  await pickOption(page, 'Departamentos', E2E_DEPARTMENT);
}
