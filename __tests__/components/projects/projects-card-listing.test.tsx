import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ProjectsCardList } from '@/components/projects/projects-card-listing';
import type { ProjectListItem, ProjectListPage } from '@/lib/projects/list';
import type { StatusFilterValue } from '@/lib/projects/constants';

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
  loadProjectsPage: vi.fn(),
  loadProjectDataYears: vi.fn(),
  observers: [] as { callback: IntersectionObserverCallback; disconnected: boolean }[],
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
  usePathname: () => '/dashboard/projects',
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@/app/actions/projects', () => ({
  loadProjectsPage: mocks.loadProjectsPage,
  loadProjectDataYears: mocks.loadProjectDataYears,
}));

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
    region: null,
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
  strategicLineId?: number;
  partnerId?: number;
  beneficiaryCategoryId?: number;
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
  strategicLineId,
  partnerId,
  beneficiaryCategoryId,
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
      strategicLines={[
        { id: 5, name: 'Formación' },
        { id: 6, name: 'Incidencia en Políticas Públicas' },
      ]}
      partners={[{ id: 8, name: 'INAU' }]}
      beneficiaryCategories={[
        { id: 3, name: 'Familias' },
        { id: 4, name: 'Jóvenes (18 a 29)' },
      ]}
      departmentId={departmentId}
      topicId={topicId}
      strategicLineId={strategicLineId}
      partnerId={partnerId}
      beneficiaryCategoryId={beneficiaryCategoryId}
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
  mocks.loadProjectDataYears.mockReset();
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

test('shows the selected department, topic, strategic line and beneficiary category in the filter menu', async () => {
  mocks.searchParams = new URLSearchParams(
    'departmentId=2&topicId=1&strategicLineId=6&beneficiaryCategoryId=4&beneficiaryYear=2025'
  );
  renderList({ departmentId: 2, topicId: 1, strategicLineId: 6, beneficiaryCategoryId: 4 });
  fireEvent.click(screen.getAllByRole('button', { name: 'Filtros de proyectos' })[0]);
  expect(
    (await screen.findByRole('combobox', { name: 'Filtrar por departamento' })).textContent
  ).toContain('Canelones');
  expect(screen.getByRole('combobox', { name: 'Filtrar por tem\u00e1tica' }).textContent).toContain(
    'Education'
  );
  expect(
    screen.getByRole('combobox', { name: 'Filtrar por l\u00ednea estrat\u00e9gica' }).textContent
  ).toContain('Incidencia en Políticas Públicas');
  expect(
    screen.getByRole('combobox', { name: 'Filtrar por categoría de beneficiarios' }).textContent
  ).toContain('Jóvenes (18 a 29)');
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

test('keeps the department, topic, strategic line and beneficiary category when loading more projects', async () => {
  mocks.loadProjectsPage.mockResolvedValue(buildPage([buildProject(2, 'Second project')], 2, 2));
  renderList({
    departmentId: 2,
    topicId: 1,
    strategicLineId: 5,
    beneficiaryCategoryId: 3,
    totalPages: 2,
  });
  await revealSentinel();
  expect(mocks.loadProjectsPage).toHaveBeenCalledWith(
    expect.objectContaining({
      departmentId: '2',
      topicId: '1',
      strategicLineId: '5',
      beneficiaryCategoryId: '3',
      beneficiaryYear: '2025',
    }),
    2
  );
});

test('clears the menu filters and selects all years while preserving status and search', async () => {
  mocks.searchParams = new URLSearchParams(
    'departmentId=2&topicId=1&strategicLineId=5&beneficiaryCategoryId=3&beneficiaryYear=2025&status=inactive&search=Centro&page=3'
  );
  renderList({
    departmentId: 2,
    topicId: 1,
    strategicLineId: 5,
    beneficiaryCategoryId: 3,
    status: 'inactive',
    search: 'Centro',
  });
  fireEvent.click(screen.getAllByRole('button', { name: 'Filtros de proyectos' })[0]);
  fireEvent.click(await screen.findByRole('button', { name: 'Limpiar filtros' }));
  expect(mocks.replace).toHaveBeenCalledWith(
    '/dashboard/projects?beneficiaryYear=all&status=inactive&search=Centro',
    { scroll: false }
  );
});

test('counts department, topic, strategic line, beneficiary category and the default year', () => {
  renderList({ departmentId: 2, topicId: 1, strategicLineId: 5, beneficiaryCategoryId: 3 });
  for (const button of screen.getAllByRole('button', { name: 'Filtros de proyectos' })) {
    expect(button.textContent).toBe('5');
    expect(button.getAttribute('aria-description')).toBe('5 filtros activos');
  }
});

test('does not count all years as an applied filter', () => {
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
    expect(button.textContent).toBe('');
    expect(button.getAttribute('aria-description')).toBe('0 filtros activos');
  }
});

test('counts the default year as an applied filter', () => {
  renderList();
  for (const button of screen.getAllByRole('button', { name: 'Filtros de proyectos' })) {
    expect(button.textContent).toBe('1');
    expect(button.getAttribute('aria-description')).toBe('1 filtros activos');
  }
});

test('shows the default year without a default marker', async () => {
  renderList();
  fireEvent.click(screen.getAllByRole('button', { name: 'Filtros de proyectos' })[0]);
  const yearSelect = await screen.findByRole('combobox', { name: 'Filtrar por año' });
  expect(yearSelect.textContent).toContain('2025');
  expect(yearSelect.textContent).not.toContain('por defecto');
});

test('counts a year different from the default as an applied filter', () => {
  renderList({ beneficiaryYear: 2024 });
  for (const button of screen.getAllByRole('button', { name: 'Filtros de proyectos' })) {
    expect(button.textContent).toBe('1');
  }
});

function startReportSelection() {
  fireEvent.click(screen.getByRole('button', { name: 'Exportar reporte' }));
}

function withDataIn(year: number) {
  return [{ ...BENEFICIARIES_2025, year }];
}

function buildAllYearsList(projects: ProjectListItem[]) {
  return (
    <ProjectsCardList
      projects={projects}
      total={projects.length}
      page={1}
      totalPages={1}
      years={[2025, 2024]}
      status="active"
      beneficiaryYear={undefined}
      search={undefined}
    />
  );
}

function stubPdfDownload() {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response('%PDF', {
      headers: { 'Content-Type': 'application/pdf', 'X-Report-File-Name': 'Informe.pdf' },
    })
  );
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchMock;
  URL.createObjectURL = vi.fn(() => 'blob:report');
  URL.revokeObjectURL = vi.fn();
  return { fetchMock, restore: () => (globalThis.fetch = originalFetch) };
}

async function exportReport() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
  });
}

const MIXED_YEARS_WARNING =
  'Los proyectos seleccionados tienen datos de distintos años y no se puede exportar un reporte con varios años. Elegí un año en los filtros.';

test('turns the project cards into checkboxes when exporting a report', () => {
  render(
    buildList({
      projects: [
        buildProject(1, 'Alpha', 'active', withDataIn(2025)),
        buildProject(2, 'Beta', 'active', withDataIn(2025)),
      ],
    })
  );

  startReportSelection();

  expect(screen.queryByRole('link', { name: /Alpha/ })).toBeNull();
  const alpha = screen.getByRole('checkbox', { name: 'Alpha' });
  expect(alpha.getAttribute('aria-checked')).toBe('false');
  expect(screen.getByRole('button', { name: 'Exportar' }).hasAttribute('disabled')).toBe(true);

  fireEvent.click(alpha);
  fireEvent.keyDown(screen.getByRole('checkbox', { name: 'Beta' }), { key: ' ' });

  expect(alpha.getAttribute('aria-checked')).toBe('true');
  expect(screen.getByRole('checkbox', { name: 'Beta' }).getAttribute('aria-checked')).toBe('true');
  expect(screen.getByText('2 proyectos seleccionados')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Exportar' }).hasAttribute('disabled')).toBe(false);

  fireEvent.click(alpha);

  expect(screen.getByText('1 proyecto seleccionado')).toBeTruthy();
});

test('selects every project matching the current filters', async () => {
  mocks.loadProjectDataYears.mockResolvedValue([
    { id: 1, year: 2025 },
    { id: 2, year: 2025 },
    { id: 3, year: 2025 },
  ]);
  render(buildList({ projects: [buildProject(1, 'Alpha')], total: 3, topicId: 2 }));

  startReportSelection();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar filtrados (3)' }));
  });

  expect(mocks.loadProjectDataYears).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'active', beneficiaryYear: '2025', topicId: '2' })
  );
  expect(screen.getByText('3 proyectos seleccionados')).toBeTruthy();
});

test('exports the report of the selected projects for the filtered year', async () => {
  const { fetchMock, restore } = stubPdfDownload();
  render(
    buildList({
      projects: [buildProject(4, 'Alpha', 'active', withDataIn(2024))],
      beneficiaryYear: 2024,
    })
  );

  startReportSelection();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Alpha' }));
  await exportReport();

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/reports/impact',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ year: 2024, projectIds: [4] }),
    })
  );
  restore();
});

test('restores the project links when the selection is cancelled', () => {
  render(buildList({ projects: [buildProject(1, 'Alpha')] }));

  startReportSelection();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Alpha' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

  expect(screen.queryByRole('checkbox', { name: 'Alpha' })).toBeNull();
  expect(screen.getByRole('link', { name: /Alpha/ }).getAttribute('href')).toBe(
    '/dashboard/projects/1'
  );
  expect(screen.getByRole('button', { name: 'Exportar reporte' })).toBeTruthy();
});

test('exports the shared year of the selected projects when listing all years', async () => {
  const { fetchMock, restore } = stubPdfDownload();
  render(
    buildAllYearsList([
      buildProject(1, 'Alpha', 'active', withDataIn(2024)),
      buildProject(2, 'Beta', 'active', withDataIn(2024)),
      buildProject(3, 'Gamma'),
    ])
  );

  startReportSelection();
  for (const name of ['Alpha', 'Beta', 'Gamma']) {
    fireEvent.click(screen.getByRole('checkbox', { name }));
  }

  expect(screen.queryByText(MIXED_YEARS_WARNING)).toBeNull();
  await exportReport();

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/reports/impact',
    expect.objectContaining({ body: JSON.stringify({ year: 2024, projectIds: [1, 2, 3] }) })
  );
  restore();
});

test('blocks the export when the selected projects have data from different years', () => {
  render(
    buildAllYearsList([
      buildProject(1, 'Alpha', 'active', withDataIn(2025)),
      buildProject(2, 'Beta', 'active', withDataIn(2024)),
    ])
  );

  startReportSelection();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Alpha' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Beta' }));

  expect(screen.getByText(MIXED_YEARS_WARNING)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Exportar' }).hasAttribute('disabled')).toBe(true);

  fireEvent.click(screen.getByRole('checkbox', { name: 'Beta' }));

  expect(screen.queryByText(MIXED_YEARS_WARNING)).toBeNull();
  expect(screen.getByRole('button', { name: 'Exportar' }).hasAttribute('disabled')).toBe(false);
});

test('blocks the export when no selected project has data', () => {
  render(buildAllYearsList([buildProject(1, 'Alpha')]));

  startReportSelection();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Alpha' }));

  expect(screen.getByText('Los proyectos seleccionados no tienen datos cargados.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Exportar' }).hasAttribute('disabled')).toBe(true);
});

test('exports the filtered year once a year is chosen after mixing years', async () => {
  const { fetchMock, restore } = stubPdfDownload();
  const { rerender } = render(
    buildAllYearsList([
      buildProject(1, 'Alpha', 'active', withDataIn(2026)),
      buildProject(2, 'Beta', 'active', withDataIn(2025)),
    ])
  );

  startReportSelection();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Alpha' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Beta' }));
  expect(screen.getByText(MIXED_YEARS_WARNING)).toBeTruthy();

  rerender(
    buildList({
      projects: [
        buildProject(1, 'Alpha', 'active', withDataIn(2025)),
        buildProject(2, 'Beta', 'active', withDataIn(2025)),
      ],
      beneficiaryYear: 2025,
    })
  );

  expect(screen.queryByText(MIXED_YEARS_WARNING)).toBeNull();
  await exportReport();

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/reports/impact',
    expect.objectContaining({ body: JSON.stringify({ year: 2025, projectIds: [1, 2] }) })
  );
  restore();
});

test('counts and clears the partner filter', async () => {
  mocks.searchParams = new URLSearchParams('partnerId=8&status=inactive');
  renderList({ partnerId: 8, status: 'inactive' });
  const [button] = screen.getAllByRole('button', { name: 'Filtros de proyectos' });
  expect(button.textContent).toBe('2');
  fireEvent.click(button);
  expect(
    (await screen.findByRole('combobox', { name: 'Filtrar por socio' })).textContent
  ).toContain('INAU');
  fireEvent.click(await screen.findByRole('button', { name: 'Limpiar filtros' }));
  expect(mocks.replace).toHaveBeenCalledWith(
    '/dashboard/projects?status=inactive&beneficiaryYear=all',
    { scroll: false }
  );
});
