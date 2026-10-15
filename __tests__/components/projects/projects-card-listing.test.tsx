import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ProjectsCardList } from '@/components/projects/projects-card-listing';
import type { ProjectListItem, ProjectListPage } from '@/lib/projects/list';
import type { StatusFilterValue } from '@/lib/projects/constants';

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
  loadProjectsPage: vi.fn(),
  observers: [] as { callback: IntersectionObserverCallback; disconnected: boolean }[],
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
  usePathname: () => '/dashboard/projects',
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@/app/actions/projects', () => ({ loadProjectsPage: mocks.loadProjectsPage }));

class IntersectionObserverMock {
  private readonly entry: { callback: IntersectionObserverCallback; disconnected: boolean };

  constructor(callback: IntersectionObserverCallback) {
    this.entry = { callback, disconnected: false };
    mocks.observers.push(this.entry);
  }

  observe() {}

  disconnect() {
    this.entry.disconnected = true;
  }
}

vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

async function revealSentinel() {
  const active = mocks.observers.filter((observer) => !observer.disconnected);
  await act(async () => {
    for (const { callback } of active) {
      callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    }
  });
}

const BENEFICIARIES_2025 = {
  year: 2025,
  directChildrenAdolescents: 10,
  indirectChildrenAdolescents: 0,
  youth18To29: 0,
  families: 2,
  coordinatedInstitutions: 0,
  communityLeaders: 0,
  basicServiceStaff: 0,
  total: 12,
};

function buildProject(
  id: number,
  name: string,
  status: ProjectListItem['status'] = 'active',
  beneficiaries: ProjectListItem['beneficiaries'] = []
): ProjectListItem {
  return {
    id,
    name,
    status,
    intensity: 'medium',
    startYear: 2025,
    zone: 'city',
    geographicScope: 'national',
    countries: [],
    cities: [],
    neighborhoods: [],
    publicDescription: null,
    coverPhoto: null,
    leadCoordinator: { id: 1, firstName: 'Carlos', lastName: 'Coordinator' },
    departments: [{ id: 1, name: 'Montevideo' }],
    beneficiaries,
  };
}

function buildPage(items: ProjectListItem[], page: number, totalPages: number): ProjectListPage {
  return { items, total: items.length, page, pageSize: 20, totalPages };
}

type ListProps = {
  projects?: ProjectListItem[];
  total?: number;
  page?: number;
  totalPages?: number;
  status?: StatusFilterValue;
  beneficiaryYear?: number;
  search?: string;
  departmentId?: number;
  topicId?: number;
};

function buildList({
  projects = [buildProject(1, 'Active project')],
  total = projects.length,
  page = 1,
  totalPages = 1,
  status = 'active',
  beneficiaryYear = 2025,
  search,
  departmentId,
  topicId,
}: ListProps = {}) {
  return (
    <ProjectsCardList
      projects={projects}
      total={total}
      page={page}
      totalPages={totalPages}
      years={[2025, 2024]}
      status={status}
      beneficiaryYear={beneficiaryYear}
      search={search}
      departments={[
        { id: 1, name: 'Montevideo' },
        { id: 2, name: 'Canelones' },
      ]}
      topics={[
        { id: 1, name: 'Education' },
        { id: 2, name: 'Health' },
      ]}
      departmentId={departmentId}
      topicId={topicId}
    />
  );
}

function renderList(props: ListProps = {}) {
  return render(buildList(props));
}

function typeSearch(value: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar proyectos por nombre' }), {
    target: { value },
  });
}

beforeEach(() => {
  mocks.searchParams = new URLSearchParams();
  mocks.replace.mockClear();
  mocks.loadProjectsPage.mockReset();
  mocks.observers.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

test('marks the status received from the server as selected', () => {
  renderList({ status: 'inactive' });

  expect(screen.getByRole('tab', { name: 'Inactivos' }).getAttribute('aria-selected')).toBe('true');
});

test('stores the selected status in the URL keeping the other filters', () => {
  mocks.searchParams = new URLSearchParams('beneficiaryYear=2025');

  renderList();
  fireEvent.click(screen.getByRole('tab', { name: 'Inactivos' }));

  expect(mocks.replace).toHaveBeenCalledWith(
    '/dashboard/projects?beneficiaryYear=2025&status=inactive',
    { scroll: false }
  );
});

test('stores the all status explicitly so the default is not applied again', () => {
  renderList();
  fireEvent.click(screen.getByRole('tab', { name: 'Todos' }));

  expect(mocks.replace).toHaveBeenCalledWith('/dashboard/projects?status=all', {
    scroll: false,
  });
});

test('renders one card per project with its latest beneficiary year', () => {
  renderList({
    projects: [
      buildProject(1, 'Project with years', 'active', [
        BENEFICIARIES_2025,
        { ...BENEFICIARIES_2025, year: 2024 },
      ]),
      buildProject(2, 'Project without data'),
    ],
    status: 'all',
  });

  expect(screen.getAllByText('Project with years')).toHaveLength(1);
  expect(screen.getByText('Beneficiarios 2025')).toBeTruthy();
  expect(screen.queryByText('Beneficiarios 2024')).toBeNull();
  expect(screen.getAllByText('Project without data')).toHaveLength(1);
  expect(screen.getByText('Sin beneficiarios')).toBeTruthy();
});

test('shows the total number of projects matching the filters', () => {
  renderList({ total: 45, totalPages: 3 });

  expect(screen.getAllByText('45 proyectos')).toHaveLength(2);
});

test('loads the next page with the current filters when the end of the list is reached', async () => {
  mocks.loadProjectsPage.mockResolvedValue(
    buildPage([buildProject(2, 'Second page project')], 2, 2)
  );

  renderList({ totalPages: 2, status: 'inactive', beneficiaryYear: 2024 });
  await revealSentinel();

  expect(mocks.loadProjectsPage).toHaveBeenCalledWith(
    { status: 'inactive', beneficiaryYear: '2024' },
    2
  );
  expect(screen.getByText('Active project')).toBeTruthy();
  expect(screen.getByText('Second page project')).toBeTruthy();
});

test('requests all years when no beneficiary year is selected', async () => {
  mocks.loadProjectsPage.mockResolvedValue(buildPage([], 2, 2));

  render(
    <ProjectsCardList
      projects={[buildProject(1, 'Active project')]}
      total={30}
      page={1}
      totalPages={2}
      years={[2025]}
      status="all"
      beneficiaryYear={undefined}
      search={undefined}
    />
  );
  await revealSentinel();

  expect(mocks.loadProjectsPage).toHaveBeenCalledWith({ status: 'all', beneficiaryYear: 'all' }, 2);
});

test('skips projects that were already loaded', async () => {
  mocks.loadProjectsPage.mockResolvedValue(
    buildPage([buildProject(1, 'Active project'), buildProject(2, 'New project')], 2, 2)
  );

  renderList({ totalPages: 2 });
  await revealSentinel();

  expect(screen.getAllByText('Active project')).toHaveLength(1);
  expect(screen.getByText('New project')).toBeTruthy();
});

test('stops loading once the last page is reached', async () => {
  mocks.loadProjectsPage.mockResolvedValue(buildPage([buildProject(2, 'Last project')], 2, 2));

  renderList({ totalPages: 2 });
  await revealSentinel();
  await revealSentinel();

  expect(mocks.loadProjectsPage).toHaveBeenCalledTimes(1);
});

test('does not observe the end of the list when everything is loaded', async () => {
  renderList({ totalPages: 1 });
  await revealSentinel();

  expect(mocks.loadProjectsPage).not.toHaveBeenCalled();
});

test('offers a retry when loading the next page fails', async () => {
  mocks.loadProjectsPage
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce(buildPage([buildProject(2, 'Recovered project')], 2, 2));

  renderList({ totalPages: 2 });
  await revealSentinel();

  expect(screen.getByText('No se pudieron cargar más proyectos.')).toBeTruthy();

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  });

  expect(mocks.loadProjectsPage).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Recovered project')).toBeTruthy();
  expect(screen.queryByText('No se pudieron cargar más proyectos.')).toBeNull();
});

test('stores the search in the URL once the user stops typing', () => {
  vi.useFakeTimers();
  mocks.searchParams = new URLSearchParams('status=active');

  renderList();
  typeSearch('cen');
  typeSearch('centro');

  expect(mocks.replace).not.toHaveBeenCalled();

  act(() => vi.runOnlyPendingTimers());

  expect(mocks.replace).toHaveBeenCalledTimes(1);
  expect(mocks.replace).toHaveBeenCalledWith('/dashboard/projects?status=active&search=centro', {
    scroll: false,
  });
});

test('keeps a filter changed while the search is still being typed', () => {
  vi.useFakeTimers();
  mocks.searchParams = new URLSearchParams('status=active');

  renderList();
  typeSearch('cen');
  fireEvent.click(screen.getByRole('tab', { name: 'Inactivos' }));
  act(() => vi.runOnlyPendingTimers());

  expect(mocks.replace).toHaveBeenLastCalledWith('/dashboard/projects?status=inactive&search=cen', {
    scroll: false,
  });
});

test('removes the search from the URL when the field is cleared', () => {
  vi.useFakeTimers();
  mocks.searchParams = new URLSearchParams('search=centro');

  renderList({ search: 'centro' });
  expect(screen.getByRole('textbox', { name: 'Buscar proyectos por nombre' })).toHaveProperty(
    'value',
    'centro'
  );

  typeSearch('   ');
  act(() => vi.runOnlyPendingTimers());

  expect(mocks.replace).toHaveBeenCalledWith('/dashboard/projects', { scroll: false });
});

test('requests the next page with the current search', async () => {
  mocks.loadProjectsPage.mockResolvedValue(buildPage([], 2, 2));

  renderList({ totalPages: 2, search: 'centro' });
  await revealSentinel();

  expect(mocks.loadProjectsPage).toHaveBeenCalledWith(
    { status: 'active', beneficiaryYear: '2025', search: 'centro' },
    2
  );
});

test('keeps the typed text and focus when the search results arrive', () => {
  vi.useFakeTimers();

  const { rerender } = renderList();
  const input = screen.getByRole('textbox', { name: 'Buscar proyectos por nombre' });
  input.focus();
  typeSearch('centro');
  act(() => vi.runOnlyPendingTimers());
  typeSearch('centro juv');

  rerender(buildList({ search: 'centro', projects: [buildProject(5, 'Centro juvenil Cerro')] }));

  expect(screen.getByRole('textbox', { name: 'Buscar proyectos por nombre' })).toBe(input);
  expect(document.activeElement).toBe(input);
  expect(input).toHaveProperty('value', 'centro juv');
});

test('shows the search from the URL when it changes outside the field', () => {
  vi.useFakeTimers();
  mocks.searchParams = new URLSearchParams('search=centro');

  const { rerender } = renderList({ search: 'centro' });
  typeSearch('centro juv');

  mocks.searchParams = new URLSearchParams('search=taller');
  rerender(buildList({ search: 'taller' }));
  act(() => vi.runOnlyPendingTimers());

  expect(screen.getByRole('textbox', { name: 'Buscar proyectos por nombre' })).toHaveProperty(
    'value',
    'taller'
  );
  expect(mocks.replace).not.toHaveBeenCalled();
});

test('restarts the loaded list when the filters change', async () => {
  mocks.loadProjectsPage.mockResolvedValue(
    buildPage([buildProject(2, 'Second page project')], 2, 2)
  );

  const { rerender } = renderList({ totalPages: 2 });
  await revealSentinel();
  expect(screen.getByText('Second page project')).toBeTruthy();

  rerender(buildList({ search: 'inactive', projects: [buildProject(9, 'Matching project')] }));

  expect(screen.getByText('Matching project')).toBeTruthy();
  expect(screen.queryByText('Active project')).toBeNull();
  expect(screen.queryByText('Second page project')).toBeNull();
});

test('shows the selected department and topic in the filter menu', async () => {
  mocks.searchParams = new URLSearchParams('departmentId=2&topicId=1&beneficiaryYear=2025');
  renderList({ departmentId: 2, topicId: 1 });
  fireEvent.click(screen.getAllByRole('button', { name: 'Filtros de proyectos' })[0]);
  expect(
    (await screen.findByRole('combobox', { name: 'Filtrar por departamento' })).textContent
  ).toContain('Canelones');
  expect(screen.getByRole('combobox', { name: 'Filtrar por tem\u00e1tica' }).textContent).toContain(
    'Education'
  );
});

test('clears a department while keeping the topic, year and search', async () => {
  mocks.searchParams = new URLSearchParams(
    'departmentId=2&topicId=1&beneficiaryYear=2025&search=Centro&page=3'
  );
  renderList({ departmentId: 2, topicId: 1, search: 'Centro' });
  fireEvent.click(screen.getAllByRole('button', { name: 'Filtros de proyectos' })[0]);
  fireEvent.click(await screen.findByRole('combobox', { name: 'Filtrar por departamento' }));
  const option = await screen.findByRole('option', { name: 'Todos' });
  fireEvent.pointerDown(option);
  fireEvent.mouseUp(option);
  fireEvent.click(option);
  expect(mocks.replace).toHaveBeenCalledWith(
    '/dashboard/projects?topicId=1&beneficiaryYear=2025&search=Centro',
    { scroll: false }
  );
});

test('keeps the department and topic when loading more projects', async () => {
  mocks.loadProjectsPage.mockResolvedValue(buildPage([buildProject(2, 'Second project')], 2, 2));
  renderList({ departmentId: 2, topicId: 1, totalPages: 2 });
  await revealSentinel();
  expect(mocks.loadProjectsPage).toHaveBeenCalledWith(
    expect.objectContaining({ departmentId: '2', topicId: '1', beneficiaryYear: '2025' }),
    2
  );
});

test('clears the menu filters and restores the default year while preserving status and search', async () => {
  mocks.searchParams = new URLSearchParams(
    'departmentId=2&topicId=1&beneficiaryYear=2025&status=inactive&search=Centro&page=3'
  );
  renderList({ departmentId: 2, topicId: 1, status: 'inactive', search: 'Centro' });
  fireEvent.click(screen.getAllByRole('button', { name: 'Filtros de proyectos' })[0]);
  fireEvent.click(await screen.findByRole('button', { name: 'Limpiar filtros' }));
  expect(mocks.replace).toHaveBeenCalledWith('/dashboard/projects?status=inactive&search=Centro', {
    scroll: false,
  });
});

test('counts department and topic without counting the default year', () => {
  renderList({ departmentId: 2, topicId: 1 });
  for (const button of screen.getAllByRole('button', { name: 'Filtros de proyectos' })) {
    expect(button.textContent).toBe('2');
    expect(button.getAttribute('aria-description')).toBe('2 filtros activos');
  }
});

test('counts all years as an applied filter', () => {
  render(
    <ProjectsCardList
      projects={[]}
      total={0}
      page={1}
      totalPages={1}
      years={[2025]}
      status="all"
      beneficiaryYear={undefined}
      search={undefined}
    />
  );
  for (const button of screen.getAllByRole('button', { name: 'Filtros de proyectos' })) {
    expect(button.textContent).toBe('1');
    expect(button.getAttribute('aria-description')).toBe('1 filtros activos');
  }
});

test('hides the filter counter for the default year without other filters', () => {
  renderList();
  for (const button of screen.getAllByRole('button', { name: 'Filtros de proyectos' })) {
    expect(button.textContent).toBe('');
    expect(button.getAttribute('aria-description')).toBe('0 filtros activos');
  }
});

test('counts a year different from the default as an applied filter', () => {
  renderList({ beneficiaryYear: 2024 });
  for (const button of screen.getAllByRole('button', { name: 'Filtros de proyectos' })) {
    expect(button.textContent).toBe('1');
  }
});
