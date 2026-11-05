import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findFirst: vi.fn(),
  findManyUsers: vi.fn(),
  findManyDepartments: vi.fn(),
  findManyTopics: vi.fn(),
  findManyStrategicLines: vi.fn(),
  getProjectHistory: vi.fn(),
  getActiveBeneficiaryCategories: vi.fn(),
  getBeneficiaryCategoryLabels: vi.fn(),
  projectToFormValues: vi.fn(),
  projectFormProps: vi.fn(),
  updateProject: vi.fn(),
  forbidden: vi.fn(() => {
    throw new Error('NEXT_FORBIDDEN');
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({ forbidden: mocks.forbidden, notFound: mocks.notFound }));
vi.mock('@/lib/auth/require-user', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/prisma', () => ({
  default: {
    project: { findFirst: mocks.findFirst },
    user: { findMany: mocks.findManyUsers },
    department: { findMany: mocks.findManyDepartments },
    topic: { findMany: mocks.findManyTopics },
    strategicLine: { findMany: mocks.findManyStrategicLines },
  },
}));
vi.mock('@/lib/projects/history', () => ({ getProjectHistory: mocks.getProjectHistory }));
vi.mock('@/lib/beneficiary-categories', () => ({
  getActiveBeneficiaryCategories: mocks.getActiveBeneficiaryCategories,
  getBeneficiaryCategoryLabels: mocks.getBeneficiaryCategoryLabels,
}));
vi.mock('@/app/actions/projects', () => ({ updateProject: mocks.updateProject }));
vi.mock('@/components/projects/form/project-to-form-values', () => ({
  projectToFormValues: mocks.projectToFormValues,
}));
vi.mock('@/components/projects/form/project-form', () => ({
  ProjectForm: ({ children, ...props }: { children: ReactNode }) => {
    mocks.projectFormProps(props);
    return <div>{children}</div>;
  },
}));
vi.mock('@/components/projects/form/project-history', () => ({
  ProjectHistory: () => <div>Historial del proyecto</div>,
}));
vi.mock('@/components/projects/delete-project-section', () => ({
  DeleteProjectSection: () => <div>Eliminar proyecto</div>,
}));
vi.mock('@/components/layout/topbar-context', () => ({
  BreadcrumbResourceLabel: ({ label }: { label: string }) => <nav>{label}</nav>,
}));

import EditProjectPage from '@/app/(protected)/dashboard/projects/[id]/edit/page';

const PROJECT = {
  id: 42,
  name: 'Huertas comunitarias',
  status: 'active',
  intensity: 'high',
  leadCoordinatorId: 7,
  topics: [{ id: 3 }],
  strategicLines: [],
  departments: [],
  localities: [],
  projectBeneficiaries: [{ id: 91, year: 2026, values: [] }],
};

function openPage(id = '42') {
  return EditProjectPage({ params: Promise.resolve({ id }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: 1, role: 'admin' });
  mocks.findFirst.mockResolvedValue(PROJECT);
  mocks.findManyUsers.mockResolvedValue([]);
  mocks.findManyDepartments.mockResolvedValue([]);
  mocks.findManyTopics.mockResolvedValue([]);
  mocks.findManyStrategicLines.mockResolvedValue([]);
  mocks.getProjectHistory.mockResolvedValue([]);
  mocks.getActiveBeneficiaryCategories.mockResolvedValue([]);
  mocks.getBeneficiaryCategoryLabels.mockResolvedValue({});
  mocks.projectToFormValues.mockReturnValue({ name: PROJECT.name });
});

test('returns not found for an invalid id without querying the database', async () => {
  await expect(openPage('invalid')).rejects.toThrow('NEXT_NOT_FOUND');

  expect(mocks.findFirst).not.toHaveBeenCalled();
});

test('returns not found for a missing or deleted project', async () => {
  mocks.findFirst.mockResolvedValue(null);

  await expect(openPage()).rejects.toThrow('NEXT_NOT_FOUND');

  expect(mocks.findFirst.mock.calls[0][0].where).toEqual({ id: 42, deletedAt: null });
});

test('forbids a coordinator who does not lead the project', async () => {
  mocks.requireUser.mockResolvedValue({ id: 2, role: 'coordinator' });

  await expect(openPage()).rejects.toThrow('NEXT_FORBIDDEN');

  expect(mocks.findManyUsers).not.toHaveBeenCalled();
});

test('renders the project for an admin, who can select the coordinator', async () => {
  render(await openPage());

  expect(screen.getByRole('heading', { name: 'Huertas comunitarias' })).toBeDefined();
  expect(screen.getByText('Activo')).toBeDefined();
  expect(screen.getByText(/intensidad/)).toBeDefined();
  expect(screen.getByText('Historial del proyecto')).toBeDefined();
  expect(screen.getByText('Eliminar proyecto')).toBeDefined();
  expect(mocks.projectFormProps).toHaveBeenCalledWith(
    expect.objectContaining({
      mode: 'edit',
      projectId: 42,
      cancelHref: '/dashboard/projects/42',
      canSelectCoordinator: true,
    })
  );
  expect(mocks.getProjectHistory).toHaveBeenCalledWith(42, [91]);
});

test('lets the lead coordinator edit without selecting another coordinator', async () => {
  mocks.requireUser.mockResolvedValue({ id: 7, role: 'coordinator' });
  mocks.findFirst.mockResolvedValue({ ...PROJECT, status: 'inactive', intensity: null });

  render(await openPage());

  expect(screen.queryByText(/intensidad/)).toBeNull();
  expect(mocks.projectFormProps).toHaveBeenCalledWith(
    expect.objectContaining({ canSelectCoordinator: false })
  );
});
