import { PROJECT_PLACEHOLDERS } from '../src/lib/projects/project-placeholders';

export const E2E_DEPARTMENT = 'Montevideo';

export const E2E_SECONDARY_DEPARTMENT = 'Canelones';

export const E2E_TOPICS = ['E2E topic A', 'E2E topic B', 'E2E topic C'] as const;

export const E2E_ADMIN = {
  firstName: 'Emilia',
  lastName: 'Admin',
  documentId: '77777777',
  email: 'e2e-admin@gurisesunidos.test',
  role: 'admin',
  status: 'active',
} as const;

export const E2E_COORDINATOR = {
  firstName: 'Nicolas',
  lastName: 'Coordinator',
  documentId: '88888888',
  email: 'e2e-coordinator@gurisesunidos.test',
  role: 'coordinator',
  status: 'active',
} as const;

export const E2E_DISABLED_COORDINATOR = {
  firstName: 'Rita',
  lastName: 'Coordinator',
  documentId: '99999999',
  email: 'e2e-disabled@gurisesunidos.test',
  role: 'coordinator',
  status: 'disabled',
} as const;

export const E2E_USERS = [E2E_ADMIN, E2E_COORDINATOR, E2E_DISABLED_COORDINATOR] as const;

export const E2E_BENEFICIARY_YEAR = 2025;

export const E2E_ACTIVE_PROJECT = {
  name: 'E2E active project',
  status: 'active',
  intensity: 'medium',
  counterpartyType: 'publicSector',
  startYear: E2E_BENEFICIARY_YEAR,
  zone: 'city',
  coverPhoto: PROJECT_PLACEHOLDERS[0],
} as const;

export const E2E_CLOSED_PROJECT = {
  name: 'E2E closed project',
  status: 'closed',
  intensity: 'low',
  counterpartyType: 'privateSector',
  startYear: 2023,
  endYear: 2024,
  zone: 'rural',
  coverPhoto: PROJECT_PLACEHOLDERS[1],
} as const;

export const E2E_PROJECTS = [E2E_ACTIVE_PROJECT, E2E_CLOSED_PROJECT] as const;
