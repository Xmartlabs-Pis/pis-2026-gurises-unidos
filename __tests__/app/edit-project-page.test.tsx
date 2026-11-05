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
import { toBeneficiaryCounts } from '@/lib/projects/beneficiary-values';
import { ASSIGNABLE_LEAD_COORDINATOR_WHERE } from '@/lib/projects/constants';

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

test('keeps the current coordinator and topics selectable even if they are no longer active', async () => {
  await openPage();

  expect(mocks.findManyUsers.mock.calls[0][0].where).toEqual({
    OR: [ASSIGNABLE_LEAD_COORDINATOR_WHERE, { id: 7 }],
  });
  expect(mocks.findManyTopics.mock.calls[0][0].where).toEqual({
    OR: [{ isActive: true }, { id: { in: [3] } }],
  });
  expect(mocks.findManyStrategicLines.mock.calls[0][0].where).toEqual({ isActive: true });
});

test('passes the loaded options to the form', async () => {
  const coordinators = [{ id: 7, firstName: 'Ana', lastName: 'García' }];
  const departments = [{ id: 1, name: 'Montevideo' }];
  const topics = [{ id: 3, name: 'Educación' }];
  const strategicLines = [{ id: 5, name: 'Formación' }];
  const beneficiaryCategories = [{ id: 9, name: 'Docentes' }];
  mocks.findManyUsers.mockResolvedValue(coordinators);
  mocks.findManyDepartments.mockResolvedValue(departments);
  mocks.findManyTopics.mockResolvedValue(topics);
  mocks.findManyStrategicLines.mockResolvedValue(strategicLines);
  mocks.getActiveBeneficiaryCategories.mockResolvedValue(beneficiaryCategories);

  render(await openPage());

  expect(mocks.projectFormProps).toHaveBeenCalledWith(
    expect.objectContaining({
      coordinators,
      departments,
      topics,
      strategicLines,
      beneficiaryCategories,
    })
  );
});

test('builds the form values from the project and its beneficiary counts', async () => {
  const beneficiaryRecords = [{ year: 2026, ...toBeneficiaryCounts([]) }];
  const categories = [{ id: 9, name: 'Docentes' }];
  mocks.getActiveBeneficiaryCategories.mockResolvedValue(categories);

  render(await openPage());

  expect(mocks.projectToFormValues).toHaveBeenCalledExactlyOnceWith(
    { ...PROJECT, projectBeneficiaries: beneficiaryRecords },
    new Date().getFullYear(),
    categories
  );
  expect(mocks.projectFormProps).toHaveBeenCalledWith(
    expect.objectContaining({
      beneficiaryRecords,
      currentYear: new Date().getFullYear(),
      initialValues: { name: PROJECT.name },
    })
  );
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
