import { test as setup } from '@playwright/test';

import { E2E_ADMIN } from '../prisma/e2e-fixtures';
import { loginAs } from './helpers';

const ADMIN_STATE = 'e2e/.auth/admin.json';

setup('authenticates as the seeded admin', async ({ page }) => {
  await loginAs(page, E2E_ADMIN.documentId);
  await page.context().storageState({ path: ADMIN_STATE });
});
