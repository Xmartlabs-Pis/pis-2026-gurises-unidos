import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { BENEFICIARY_CATEGORY_KEYS, beneficiaryValueRows } from '../mocks/beneficiary-values';
import { prismaMock } from '../mocks/prisma';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getProjectHistory: vi.fn(),
  getActiveBeneficiaryCategories: vi.fn(),
  getBeneficiaryCategoryLabels: vi.fn(),
  projectToFormValues: vi.fn(),
  projectFormProps: vi.fn(),
  projectHistoryProps: vi.fn(),
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
  ProjectHistory: (props: unknown) => {
    mocks.projectHistoryProps(props);
    return <div>Historial del proyecto</div>;
  },
}));
vi.mock('@/components/projects/delete-project-section', () => ({
  DeleteProjectSection: ({ projectId }: { projectId: number }) => (
    <div>Eliminar proyecto {projectId}</div>
  ),
}));
vi.mock('@/components/layout/topbar-context', () => ({
  BreadcrumbResourceLabel: ({ label }: { label: string }) => <nav>{label}</nav>,
}));

import EditProjectPage from '@/app/(protected)/dashboard/projects/[id]/edit/page';
import { ASSIGNABLE_LEAD_COORDINATOR_WHERE } from '@/lib/projects/constants';
import { resolveSuspenseChild } from '../helpers/suspense-page';

const CURRENT_YEAR = 2026;
const CATEGORY_KEY = BENEFICIARY_CATEGORY_KEYS[0];

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
  projectBeneficiaries: [
    { id: 91, year: 2026, values: beneficiaryValueRows({ [CATEGORY_KEY]: 12 }) },
    { id: 90, year: 2025, values: beneficiaryValueRows({ [CATEGORY_KEY]: 4 }) },
  ],
};

async function openPage(id = '42') {
  return resolveSuspenseChild(await EditProjectPage({ params: Promise.resolve({ id }) }));
}

function projectFormProps() {
  return mocks.projectFormProps.mock.calls[0][0];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(CURRENT_YEAR, 5, 15));
  mocks.requireUser.mockResolvedValue({ id: 1, role: 'admin' });
  prismaMock.project.findFirst.mockResolvedValue(PROJECT);
  prismaMock.user.findMany.mockResolvedValue([]);
  prismaMock.department.findMany.mockResolvedValue([]);
  prismaMock.topic.findMany.mockResolvedValue([]);
  prismaMock.strategicLine.findMany.mockResolvedValue([]);
  mocks.getProjectHistory.mockResolvedValue([]);
  mocks.getActiveBeneficiaryCategories.mockResolvedValue([]);
  mocks.getBeneficiaryCategoryLabels.mockResolvedValue({});
  mocks.projectToFormValues.mockReturnValue({ name: PROJECT.name });
});

afterEach(() => {
  vi.useRealTimers();
});

test('returns not found for an invalid id without querying the database', async () => {
  await expect(openPage('invalid')).rejects.toThrow('NEXT_NOT_FOUND');

  expect(prismaMock.project.findFirst).not.toHaveBeenCalled();
});

test('returns not found for a missing or deleted project', async () => {
  prismaMock.project.findFirst.mockResolvedValue(null);

  await expect(openPage()).rejects.toThrow('NEXT_NOT_FOUND');

  expect(prismaMock.project.findFirst.mock.calls[0][0].where).toEqual({
    id: 42,
    deletedAt: null,
  });
});

test('forbids a coordinator who does not lead the project', async () => {
  mocks.requireUser.mockResolvedValue({ id: 2, role: 'coordinator' });

  await expect(openPage()).rejects.toThrow('NEXT_FORBIDDEN');

  expect(prismaMock.user.findMany).not.toHaveBeenCalled();
});

test('renders the project for an admin, who can select the coordinator', async () => {
  render(await openPage());

  expect(screen.getByRole('heading', { name: 'Huertas comunitarias' })).toBeDefined();
  expect(screen.getByText('Activo')).toBeDefined();
  expect(screen.getByText(/intensidad/)).toBeDefined();
  expect(projectFormProps()).toEqual(
    expect.objectContaining({
      mode: 'edit',
      projectId: 42,
      cancelHref: '/dashboard/projects/42',
      canSelectCoordinator: true,
    })
  );
});

test('keeps the current coordinator and topics selectable even if they are no longer active', async () => {
  await openPage();

  expect(prismaMock.user.findMany.mock.calls[0][0].where).toEqual({
    OR: [ASSIGNABLE_LEAD_COORDINATOR_WHERE, { id: 7 }],
  });
  expect(prismaMock.topic.findMany.mock.calls[0][0].where).toEqual({
    OR: [{ isActive: true }, { id: { in: [3] } }],
  });
  expect(prismaMock.strategicLine.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
});

test('passes the loaded options to the form', async () => {
  const coordinators = [{ id: 7, firstName: 'Ana', lastName: 'García' }];
  const departments = [{ id: 1, name: 'Montevideo' }];
  const topics = [{ id: 3, name: 'Educación' }];
  const strategicLines = [{ id: 5, name: 'Formación' }];
  const beneficiaryCategories = [{ id: 9, name: 'Docentes' }];
  prismaMock.user.findMany.mockResolvedValue(coordinators);
  prismaMock.department.findMany.mockResolvedValue(departments);
  prismaMock.topic.findMany.mockResolvedValue(topics);
  prismaMock.strategicLine.findMany.mockResolvedValue(strategicLines);
  mocks.getActiveBeneficiaryCategories.mockResolvedValue(beneficiaryCategories);

  render(await openPage());

  expect(projectFormProps()).toEqual(
    expect.objectContaining({
      coordinators,
      departments,
      topics,
      strategicLines,
      beneficiaryCategories,
    })
  );
});

test('builds the form values from each year of beneficiary counts', async () => {
  const categories = [{ id: 9, name: 'Docentes' }];
  mocks.getActiveBeneficiaryCategories.mockResolvedValue(categories);

  render(await openPage());

  const expectedRecords = [
    expect.objectContaining({ year: 2026, [CATEGORY_KEY]: 12 }),
    expect.objectContaining({ year: 2025, [CATEGORY_KEY]: 4 }),
  ];
  expect(mocks.projectToFormValues).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ id: 42, projectBeneficiaries: expectedRecords }),
    CURRENT_YEAR,
    categories
  );
  expect(projectFormProps()).toEqual(
    expect.objectContaining({
      beneficiaryRecords: expectedRecords,
      currentYear: CURRENT_YEAR,
      initialValues: { name: PROJECT.name },
    })
  );
});

test('binds the submit action to the edited project', async () => {
  const previousState = {};
  const formData = new FormData();

  render(await openPage());
  await projectFormProps().submitAction(previousState, formData);

  expect(mocks.updateProject).toHaveBeenCalledExactlyOnceWith(42, previousState, formData);
});

test('targets the edited project in the delete section', async () => {
  render(await openPage());

  expect(screen.getByText('Eliminar proyecto 42')).toBeDefined();
});

test('shows the history of the project and its beneficiary records', async () => {
  const entries = [{ id: 1 }];
  const fieldLabels = { name: 'Nombre' };
  mocks.getProjectHistory.mockResolvedValue(entries);
  mocks.getBeneficiaryCategoryLabels.mockResolvedValue(fieldLabels);

  render(await openPage());

  expect(mocks.getProjectHistory).toHaveBeenCalledExactlyOnceWith(42, [91, 90]);
  expect(mocks.projectHistoryProps).toHaveBeenCalledWith({ entries, fieldLabels });
});

test('lets the lead coordinator edit without selecting another coordinator', async () => {
  mocks.requireUser.mockResolvedValue({ id: 7, role: 'coordinator' });
  prismaMock.project.findFirst.mockResolvedValue({
    ...PROJECT,
    status: 'inactive',
    intensity: null,
  });

  render(await openPage());

  expect(screen.queryByText(/intensidad/)).toBeNull();
  expect(projectFormProps()).toEqual(expect.objectContaining({ canSelectCoordinator: false }));
});
